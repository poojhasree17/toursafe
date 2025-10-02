#!/usr/bin/env python3
"""
Complete demo runner for TourSafe SIH 2025 PS-25002 - Python version
Runs all simulation scripts in sequence for a complete demo experience
"""

import asyncio
import json
import os
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from typing import List, Optional
import aiohttp
import dotenv

# Load environment variables
dotenv.load_dotenv("../.env.local")

@dataclass
class DemoStep:
    """Represents a single demo step"""
    name: str
    description: str
    script: str
    delay: int = 0  # Delay before starting this step (in seconds)
    duration: Optional[int] = None  # How long to run this step (in seconds)

class DemoRunner:
    """Orchestrates the complete demo sequence"""

    def __init__(self):
        self.demo_steps: List[DemoStep] = [
            DemoStep(
                name="Database Seeding",
                description="Setting up demo data (users, tourists, zones)",
                script="python seed.py",
                delay=0,
                duration=15
            ),
            DemoStep(
                name="VC Issuance",
                description="Creating verifiable credentials with blockchain anchoring",
                script="python test_vc.py",
                delay=2,
                duration=20
            ),
            DemoStep(
                name="Tourist Movement Simulation",
                description="Simulating tourist movement with different behavior patterns",
                script="python simulate_tourist.py",
                delay=1,
                duration=300  # 5 minutes of movement simulation
            ),
            DemoStep(
                name="Incident Generation",
                description="Creating various incident types for demonstration",
                script="python simulate_incidents.py",
                delay=1,
                duration=15
            )
        ]

        self.processes: List[subprocess.Popen] = []
        self.stopped = False

    def signal_handler(self, signum, frame):
        """Handle graceful shutdown"""
        print("\n🛑 Demo runner stopped by user")
        self.stopped = True
        self._cleanup_processes()
        sys.exit(0)

    def _cleanup_processes(self):
        """Clean up any running processes"""
        for process in self.processes:
            if process.poll() is None:  # Process is still running
                print(f"🛑 Terminating process: {process.args}")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()

    async def check_services(self) -> bool:
        """Check if required services are running"""
        print("🔍 Checking if required services are running...")

        services_status = []

        try:
            # Check if web server is running
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:3000") as response:
                    if response.status == 200:
                        print("✅ Web server is running")
                        services_status.append(True)
                    else:
                        print(f"⚠️  Web server returned status {response.status}")
                        services_status.append(False)
        except Exception as e:
            print(f"❌ Web server not accessible: {e}")
            services_status.append(False)

        try:
            # Check if AI service is running
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:8000/health") as response:
                    if response.status == 200:
                        print("✅ AI service is running")
                        services_status.append(True)
                    else:
                        print(f"⚠️  AI service returned status {response.status}")
                        services_status.append(False)
        except Exception as e:
            print(f"⚠️  AI service not running - anomaly detection will be limited: {e}")
            services_status.append(False)

        all_services_ok = all(services_status)

        if not all_services_ok:
            print("⚠️  Services not fully available - some features may not work")
            print("💡 Make sure to run:")
            print("   • Web server: cd ../apps/web && npm run dev")
            print("   • AI service: cd ../apps/ai && python -m uvicorn main:app --host 0.0.0.0 --port 8000")

        return all_services_ok

    async def run_script(self, step: DemoStep) -> bool:
        """Run a single script with timeout"""
        print(f"🎬 Starting: {step.name}")
        print(f"   {step.description}")

        try:
            # Split command into arguments
            cmd_parts = step.script.split()
            script_path = cmd_parts[1]  # Get the script name

            # Use asyncio subprocess for better control
            process = await asyncio.create_subprocess_exec(
                *cmd_parts,
                cwd=os.path.dirname(os.path.abspath(__file__)),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env=os.environ.copy()
            )

            self.processes.append(process)

            try:
                # Wait for completion or timeout
                if step.duration:
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(),
                        timeout=step.duration
                    )
                else:
                    stdout, stderr = await process.communicate()

                # Decode output
                output = stdout.decode() if stdout else ""

                if process.returncode == 0:
                    print(f"✅ Completed: {step.name}")
                    if output.strip():
                        print(f"📄 Script output:\n{output}")
                    return True
                else:
                    print(f"❌ Failed: {step.name} (exit code: {process.returncode})")
                    if output.strip():
                        print(f"📄 Script error:\n{output}")
                    return False

            except asyncio.TimeoutError:
                print(f"⏰ Stopping script after {step.duration} seconds: {step.name}")
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutExpired:
                    process.kill()
                    await process.wait()
                return True  # Consider timeout as success for demo purposes

        except Exception as e:
            print(f"❌ Error running {step.name}: {e}")
            return False

    async def run_demo(self) -> None:
        """Run the complete demo sequence"""
        print("🎭 TourSafe Demo Runner - SIH 2025 PS-25002")
        print("=" * 60)
        print("🚀 This will run a complete demonstration of the TourSafe system")
        print("📋 Demo includes:")
        print("   • Database seeding with demo data")
        print("   • Verifiable credential issuance & blockchain anchoring")
        print("   • Real-time tourist movement simulation")
        print("   • AI-powered anomaly detection")
        print("   • Incident generation and response")
        print("   • Push notifications and real-time updates")
        print("=" * 60)

        # Check services
        services_ok = await self.check_services()

        if not services_ok:
            print("\n⚠️  Warning: Some services are not running.")
            response = input("Continue anyway? (y/N): ").strip().lower()
            if response != 'y':
                print("🛑 Demo cancelled.")
                return

        print("\n🎯 Starting demo sequence...\n")

        successful_steps = 0

        for i, step in enumerate(self.demo_steps):
            if self.stopped:
                break

            print(f"📍 Step {i + 1}/{len(self.demo_steps)}: {step.name}")

            if step.delay > 0:
                print(f"⏳ Waiting {step.delay} seconds before starting...")
                await asyncio.sleep(step.delay)

            try:
                success = await self.run_script(step)
                if success:
                    successful_steps += 1

                # Clean up completed processes
                self.processes = [p for p in self.processes if p.poll() is None]

            except Exception as e:
                print(f"❌ Step failed: {step.name} - {e}")
                if not services_ok:
                    print("💡 You may need to run individual steps manually or check service availability")
                    break

            # Small pause between steps
            if i < len(self.demo_steps) - 1 and not self.stopped:
                print("⏸️  Pausing between steps...\n")
                await asyncio.sleep(2)

        # Final summary
        print("\n" + "=" * 60)
        print("🎉 Demo sequence completed!")
        print(f"📊 Success rate: {successful_steps}/{len(self.demo_steps)} steps completed")

        if successful_steps == len(self.demo_steps):
            print("\n🎭 Demo Experience:")
            print("   🌐 Tourist PWA: http://localhost:3000/tourist")
            print("   🛡️  Admin Dashboard: http://localhost:3000/admin")
            print("   📱 PWA can be installed as a mobile app")
            print("\n🔗 Quick Access:")
            print("   • Issue VC: http://localhost:3000/admin/vc")
            print("   • Verify VC: http://localhost:3000/admin/audit")
            print("   • View Incidents: http://localhost:3000/admin/incidents")
            print("   • Manage Zones: http://localhost:3000/admin/zones")
            print("\n🚀 Ready for SIH 2025 PS-25002 judging!")
        else:
            print(f"\n⚠️  {len(self.demo_steps) - successful_steps} steps failed.")
            print("💡 Run individual scripts manually for debugging.")

def main():
    """Main entry point"""
    runner = DemoRunner()

    # Set up signal handlers
    signal.signal(signal.SIGINT, runner.signal_handler)
    signal.signal(signal.SIGTERM, runner.signal_handler)

    try:
        asyncio.run(runner.run_demo())
    except KeyboardInterrupt:
        print("\n🛑 Demo interrupted by user")
    except Exception as e:
        print(f"❌ Demo runner failed: {e}")
        runner._cleanup_processes()
        sys.exit(1)
    finally:
        runner._cleanup_processes()

if __name__ == "__main__":
    main()

