'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Clock, MapPin, Activity, Bell, Zap, X } from 'lucide-react';
import { SafetyScoreResult } from '../lib/utils';

interface SafetyScoreProps {
  safetyScore: SafetyScoreResult;
  className?: string;
}

interface SafetyAlert {
  id: string;
  type: 'zone' | 'sos' | 'emergency' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  zoneType?: 'SAFE' | 'ALERT' | 'RESTRICTED';
}

interface SafetyAlertsPanelProps {
  alerts: SafetyAlert[];
  onDismissAlert: (alertId: string) => void;
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

export function SafetyAlertsPanel({ alerts, onDismissAlert, className }: SafetyAlertsPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getAlertIcon = (type: string, priority: string) => {
    if (type === 'sos' || type === 'emergency') {
      return <Zap className={`h-5 w-5 ${priority === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />;
    }
    if (type === 'zone') {
      return <MapPin className={`h-5 w-5 ${priority === 'high' ? 'text-red-600' : priority === 'medium' ? 'text-yellow-600' : 'text-green-600'}`} />;
    }
    return <Bell className="h-5 w-5 text-blue-600" />;
  };

  const getAlertBgColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-800 bg-red-100';
      case 'high': return 'text-orange-800 bg-orange-100';
      case 'medium': return 'text-yellow-800 bg-yellow-100';
      case 'low': return 'text-blue-800 bg-blue-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  if (!isVisible) return null;

  return (
    <Card className={`${getAlertBgColor(alerts.length > 0 && alerts[0].priority)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Bell className="h-5 w-5 mr-2 text-gray-600" />
            Safety Alerts
          </CardTitle>
          {alerts.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alerts[0].priority)}`}>
                {alerts.length} active
              </span>
            </div>
          )}
        </div>
        <CardDescription>
          Real-time safety notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">All Clear</p>
            <p className="text-sm text-gray-500">No active safety alerts</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${getAlertBgColor(alert.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type, alert.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">
                          {alert.title}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {alert.timestamp.toLocaleTimeString()}
                        </span>
                        {alert.location && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {alert.location}
                          </span>
                        )}
                        {alert.zoneType && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                            alert.zoneType === 'SAFE' ? 'bg-green-100 text-green-800' :
                            alert.zoneType === 'ALERT' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {alert.zoneType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDismissAlert(alert.id)}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
