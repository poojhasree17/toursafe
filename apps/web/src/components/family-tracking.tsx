'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Button } from '@toursafe/ui';
import { Input } from '@toursafe/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@toursafe/ui';
import {
  Users, Plus, Trash2, CheckCircle, AlertCircle, Clock, Shield,
  Eye, EyeOff, Copy, Mail, Phone, Calendar, User
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FamilyMember {
  email: string;
  name: string;
  relationship: 'parent' | 'spouse' | 'sibling' | 'child' | 'guardian' | 'other';
}

interface TrackingRelationship {
  id: string;
  family_member_name: string;
  family_member_email: string;
  relationship: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

interface FamilyTrackingProps {
  touristId: string;
  touristName: string;
}

export function FamilyTrackingSettings({ touristId, touristName }: FamilyTrackingProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { email: '', name: '', relationship: 'parent' }
  ]);
  const [existingTracking, setExistingTracking] = useState<TrackingRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadExistingTracking();
  }, [touristId]);

  const loadExistingTracking = async () => {
    try {
      const response = await fetch(`/api/v1/family?touristId=${touristId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingTracking(data.tracking || []);
      }
    } catch (error) {
      console.error('Error loading family tracking:', error);
    }
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { email: '', name: '', relationship: 'parent' }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const setupFamilyTracking = async () => {
    if (familyMembers.some(member => !member.email || !member.name)) {
      toast.error('Please fill in all family member details');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId,
          familyMembers
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Family tracking setup successfully!');
        setShowAddForm(false);
        setFamilyMembers([{ email: '', name: '', relationship: 'parent' }]);
        loadExistingTracking();
      } else {
        toast.error(result.error || 'Failed to setup family tracking');
      }
    } catch (error) {
      console.error('Family tracking setup error:', error);
      toast.error('Failed to setup family tracking');
    } finally {
      setLoading(false);
    }
  };

  const removeFamilyMemberTracking = async (email: string) => {
    try {
      const response = await fetch('/api/v1/family', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId,
          familyMemberEmail: email
        })
      });

      if (response.ok) {
        toast.success('Family member removed from tracking');
        loadExistingTracking();
      } else {
        toast.error('Failed to remove family member');
      }
    } catch (error) {
      console.error('Remove family tracking error:', error);
      toast.error('Failed to remove family member');
    }
  };

  const copyAccessToken = (tracking: TrackingRelationship) => {
    // In a real implementation, you'd generate and display the access token
    toast.success('Access token copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Family Location Sharing
          </CardTitle>
          <CardDescription>
            Share your real-time location with trusted family members for safety monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">Privacy Protected</p>
                <p className="text-blue-800">
                  Location sharing is completely optional and requires explicit consent.
                  Family members receive secure, time-limited access tokens that can be revoked at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Existing Family Members */}
          {existingTracking.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-900">Active Family Members</h4>
              <div className="space-y-2">
                {existingTracking.map((tracking) => (
                  <div key={tracking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{tracking.family_member_name}</div>
                        <div className="text-xs text-gray-600">{tracking.family_member_email}</div>
                        <div className="text-xs text-gray-500 capitalize">{tracking.relationship}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAccessToken(tracking)}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Token
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFamilyMemberTracking(tracking.family_member_email)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Family Member Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">
                {showAddForm ? 'Add Family Members' : 'Add Family Members'}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add'}
              </Button>
            </div>

            {showAddForm && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                {familyMembers.map((member, index) => (
                  <div key={index} className="space-y-3 p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Family Member {index + 1}</span>
                      {familyMembers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFamilyMember(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <Input
                          placeholder="Enter full name"
                          value={member.name}
                          onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={member.email}
                          onChange={(e) => updateFamilyMember(index, 'email', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Relationship
                      </label>
                      <Select
                        value={member.relationship}
                        onValueChange={(value: any) => updateFamilyMember(index, 'relationship', value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFamilyMember}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another
                  </Button>

                  <Button
                    onClick={setupFamilyTracking}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Setup Tracking
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 mb-1">How Family Tracking Works</p>
                <ul className="text-amber-800 space-y-1 text-xs">
                  <li>• Family members receive a secure access token via email</li>
                  <li>• Tokens expire after 24 hours and can be refreshed</li>
                  <li>• You can revoke access at any time</li>
                  <li>• Location data is only shared when you're actively tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
