#!/usr/bin/env python3
"""
Seed script to populate the database with demo data - Python version
"""

import asyncio
import json
import os
import sys
import uuid
from typing import Dict, List, Any
import aiohttp
import dotenv
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

# Load environment variables
dotenv.load_dotenv("../.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase environment variables")
    print("💡 Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local")
    sys.exit(1)

# Create Supabase client with service role key
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    options=ClientOptions(
        auto_refresh_token=False,
        persist_session=False
    )
)

async def create_demo_users() -> None:
    """Create demo users in Supabase Auth"""
    print("👤 Creating demo users in Supabase Auth...")

    demo_users = [
        {
            "email": "admin@toursafe.demo",
            "password": "admin123",
            "role": "ADMIN"
        },
        {
            "email": "operator@toursafe.demo",
            "password": "operator123",
            "role": "OPERATOR"
        }
    ]

    for user in demo_users:
        try:
            # Create user in Supabase Auth
            response = supabase.auth.admin.create_user({
                "email": user["email"],
                "password": user["password"],
                "email_confirm": True,
                "user_metadata": {
                    "role": user["role"]
                }
            })

            if response.user:
                print(f"✅ Created user: {user['email']} ({user['role']})")

                # Also add to app_users table
                try:
                    supabase.table("app_users").upsert({
                        "id": response.user.id,
                        "email": user["email"],
                        "role": user["role"]
                    }).execute()
                except Exception as e:
                    print(f"⚠️  Warning: Could not add user to app_users table: {e}")
            else:
                print(f"❌ Failed to create user {user['email']}: {response}")

        except Exception as e:
            print(f"❌ Error creating user {user['email']}: {e}")

async def verify_database_connection() -> None:
    """Verify database connection and check existing data"""
    print("📊 Verifying database connection...")

    try:
        # Check zones table
        response = supabase.table("zones").select("*", count="exact").execute()

        if response.count is not None:
            print(f"✅ Database connection verified")
            print(f"📍 Found {response.count} zones in database")

            # Show sample data if available
            if response.data:
                zones = response.data[:3]  # Show first 3 zones
                print("🗺️  Sample zones:")
                for zone in zones:
                    print(f"   - {zone.get('name', 'Unknown')} ({zone.get('type', 'Unknown')})")

        # Check tourists table
        tourist_response = supabase.table("tourists").select("id, display_name").limit(5).execute()

        if tourist_response.data:
            tourists = tourist_response.data
            print("👥 Demo tourists found:")
            for tourist in tourists:
                print(f"   - {tourist.get('display_name', 'Unknown')} ({tourist['id']})")

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Make sure your Supabase project is running and accessible")
        raise

async def run_seed_sql() -> None:
    """Execute seed SQL file if it exists"""
    seed_file = "../supabase/seed.sql"

    if os.path.exists(seed_file):
        print("📄 Running seed SQL file...")

        try:
            with open(seed_file, 'r') as f:
                seed_sql = f.read()

            # Split SQL into individual statements (basic approach)
            statements = [stmt.strip() for stmt in seed_sql.split(';') if stmt.strip()]

            for statement in statements:
                if statement and not statement.startswith('--'):
                    try:
                        supabase.rpc("execute_sql", {"sql": statement}).execute()
                    except Exception as e:
                        # For demo purposes, just log warnings for SQL execution issues
                        print(f"⚠️  Warning executing SQL: {e}")

            print("✅ Seed SQL execution completed")

        except Exception as e:
            print(f"⚠️  Warning: Could not execute seed SQL: {e}")
            print("💡 This is normal if using Supabase Dashboard for seeding")
    else:
        print("📄 No seed.sql file found, skipping SQL execution")

async def seed_database() -> None:
    """Main seeding function"""
    print("🌱 Starting database seeding...")

    try:
        # Step 1: Create demo users
        await create_demo_users()

        # Step 2: Verify database connection
        await verify_database_connection()

        # Step 3: Run seed SQL if available
        await run_seed_sql()

        print("✅ Database seeding completed!")
        print("\n🎭 Ready for demo:")
        print("   • Admin login: admin@toursafe.demo / admin123")
        print("   • Operator login: operator@toursafe.demo / operator123")

    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        sys.exit(1)

def main() -> None:
    """Main entry point"""
    try:
        asyncio.run(seed_database())
    except KeyboardInterrupt:
        print("\n🛑 Seeding interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

