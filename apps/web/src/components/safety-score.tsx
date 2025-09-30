'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Clock, MapPin, Activity } from 'lucide-react';
import { SafetyScoreResult } from '../lib/utils';

interface SafetyScoreProps {
  safetyScore: SafetyScoreResult;
  className?: string;
}

export function SafetyScoreDisplay({ safetyScore, className }: SafetyScoreProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'MEDIUM':
        return <Info className="h-5 w-5 text-yellow-600" />;
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'CRITICAL':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'text-green-800 bg-green-100';
      case 'MEDIUM':
        return 'text-yellow-800 bg-yellow-100';
      case 'HIGH':
        return 'text-orange-800 bg-orange-100';
      case 'CRITICAL':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className={`${getScoreBgColor(safetyScore.score)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Shield className="h-5 w-5 mr-2 text-gray-600" />
            Safety Score
          </CardTitle>
          {getRiskIcon(safetyScore.riskLevel)}
        </div>
        <CardDescription>
          Real-time safety assessment based on your location and activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(safetyScore.score)}`}>
            {safetyScore.score}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(safetyScore.riskLevel)}`}>
            {safetyScore.riskLevel} RISK
          </div>
        </div>

        {/* Score Progress Ring */}
        <div className="relative">
          <svg className="w-24 h-24 mx-auto transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - safetyScore.score / 100)}`}
              className={`${getScoreColor(safetyScore.score)} transition-all duration-1000 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-semibold ${getScoreColor(safetyScore.score)}`}>
              {safetyScore.score}%
            </span>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Location:</span>
            <span className={`font-medium ${
              safetyScore.factors.locationRisk > 0.7 ? 'text-red-600' :
              safetyScore.factors.locationRisk > 0.4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {Math.round(safetyScore.factors.locationRisk * 100)}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Time:</span>
            <span className={`font-medium ${
              safetyScore.factors.timeOfDay > 0.7 ? 'text-red-600' :
              safetyScore.factors.timeOfDay > 0.4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {Math.round(safetyScore.factors.timeOfDay * 100)}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Activity:</span>
            <span className={`font-medium ${
              safetyScore.factors.recentActivity > 0.7 ? 'text-red-600' :
              safetyScore.factors.recentActivity > 0.4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {Math.round(safetyScore.factors.recentActivity * 100)}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Pattern:</span>
            <span className={`font-medium ${
              safetyScore.factors.travelPattern > 0.7 ? 'text-red-600' :
              safetyScore.factors.travelPattern > 0.4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {Math.round(safetyScore.factors.travelPattern * 100)}%
            </span>
          </div>
        </div>

        {/* Recommendations */}
        {safetyScore.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-900">Recommendations</h4>
            <div className="space-y-1">
              {safetyScore.recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
          Updated in real-time
        </div>
      </CardContent>
    </Card>
  );
}
