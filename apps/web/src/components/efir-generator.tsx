'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@toursafe/ui';
import { Button } from '@toursafe/ui';
import { Input } from '@toursafe/ui';
import { Textarea } from '@toursafe/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@toursafe/ui';
import {
  FileText, Plus, Trash2, Download, Eye, CheckCircle, AlertCircle,
  Clock, Shield, Calendar, MapPin, User, Phone, FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Witness {
  name: string;
  phone?: string;
  address?: string;
  statement?: string;
}

interface EFIRFormData {
  incidentType: 'MISSING_PERSON' | 'THEFT' | 'ASSAULT' | 'ACCIDENT' | 'OTHER';
  incidentDescription: string;
  incidentLocation: string;
  incidentDateTime: string;
  complainantName: string;
  complainantAddress: string;
  complainantPhone: string;
  witnesses: Witness[];
}

interface EFIRRecord {
  id: string;
  fir_number: string;
  incident_type: string;
  incident_description: string;
  status: string;
  created_at: string;
  submitted_at?: string;
}

interface EFIRGeneratorProps {
  touristId: string;
  touristName: string;
  currentLocation?: { lat: number; lng: number };
  onIncidentCreated?: (incidentId: string) => void;
}

export function EFIRGenerator({ touristId, touristName, currentLocation, onIncidentCreated }: EFIRGeneratorProps) {
  const [formData, setFormData] = useState<EFIRFormData>({
    incidentType: 'MISSING_PERSON',
    incidentDescription: '',
    incidentLocation: '',
    incidentDateTime: new Date().toISOString().slice(0, 16),
    complainantName: touristName,
    complainantAddress: '',
    complainantPhone: '',
    witnesses: []
  });

  const [existingEFIRs, setExistingEFIRs] = useState<EFIRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');

  useEffect(() => {
    loadExistingEFIRs();
  }, [touristId]);

  useEffect(() => {
    if (currentLocation) {
      // Use reverse geocoding in production
      setFormData(prev => ({
        ...prev,
        incidentLocation: `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
      }));
    }
  }, [currentLocation]);

  const loadExistingEFIRs = async () => {
    try {
      const response = await fetch(`/api/v1/efir?touristId=${touristId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingEFIRs(data.efirs || []);
      }
    } catch (error) {
      console.error('Error loading E-FIRs:', error);
    }
  };

  const addWitness = () => {
    setFormData(prev => ({
      ...prev,
      witnesses: [...prev.witnesses, { name: '', phone: '', address: '', statement: '' }]
    }));
  };

  const removeWitness = (index: number) => {
    setFormData(prev => ({
      ...prev,
      witnesses: prev.witnesses.filter((_, i) => i !== index)
    }));
  };

  const updateWitness = (index: number, field: keyof Witness, value: string) => {
    const updated = [...formData.witnesses];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, witnesses: updated }));
  };

  const generateEFIR = async () => {
    if (!formData.incidentDescription || !formData.complainantName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/efir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId,
          incidentType: formData.incidentType,
          incidentDescription: formData.incidentDescription,
          incidentLocation: formData.incidentLocation || undefined,
          incidentDateTime: formData.incidentDateTime,
          complainantName: formData.complainantName,
          complainantAddress: formData.complainantAddress || undefined,
          complainantPhone: formData.complainantPhone || undefined,
          witnesses: formData.witnesses.filter(w => w.name.trim())
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`E-FIR generated successfully! FIR Number: ${result.efir.firNumber}`);
        setShowForm(false);
        setActiveTab('view');
        loadExistingEFIRs();

        // Reset form
        setFormData({
          incidentType: 'MISSING_PERSON',
          incidentDescription: '',
          incidentLocation: currentLocation ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : '',
          incidentDateTime: new Date().toISOString().slice(0, 16),
          complainantName: touristName,
          complainantAddress: '',
          complainantPhone: '',
          witnesses: []
        });
      } else {
        toast.error(result.error || 'Failed to generate E-FIR');
      }
    } catch (error) {
      console.error('E-FIR generation error:', error);
      toast.error('Failed to generate E-FIR');
    } finally {
      setLoading(false);
    }
  };

  const downloadEFIR = async (efirId: string, firNumber: string) => {
    try {
      const response = await fetch(`/api/v1/efir/${efirId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FIR-${firNumber}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('E-FIR downloaded successfully');
      } else {
        toast.error('Failed to download E-FIR');
      }
    } catch (error) {
      console.error('E-FIR download error:', error);
      toast.error('Failed to download E-FIR');
    }
  };

  const submitEFIR = async (efirId: string) => {
    try {
      const response = await fetch('/api/v1/efir', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          efirId,
          status: 'SUBMITTED'
        })
      });

      if (response.ok) {
        toast.success('E-FIR submitted successfully');
        loadExistingEFIRs();
      } else {
        toast.error('Failed to submit E-FIR');
      }
    } catch (error) {
      console.error('E-FIR submission error:', error);
      toast.error('Failed to submit E-FIR');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Electronic FIR (E-FIR) System
          </CardTitle>
          <CardDescription>
            Generate official First Information Reports for incidents and emergencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeTab === 'create' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('create')}
              className="flex-1"
            >
              Create E-FIR
            </Button>
            <Button
              variant={activeTab === 'view' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('view')}
              className="flex-1"
            >
              View E-FIRs ({existingEFIRs.length})
            </Button>
          </div>

          {activeTab === 'create' && (
            <div className="space-y-4">
              {!showForm ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate New E-FIR</h3>
                  <p className="text-gray-600 mb-4">
                    Create an official First Information Report for incidents, missing persons, or emergencies
                  </p>
                  <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create E-FIR
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-blue-900 mb-1">Official Document</p>
                        <p className="text-blue-800">
                          E-FIRs are legally recognized documents with blockchain verification for authenticity
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Incident Type *
                      </label>
                      <Select
                        value={formData.incidentType}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, incidentType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MISSING_PERSON">Missing Person</SelectItem>
                          <SelectItem value="THEFT">Theft</SelectItem>
                          <SelectItem value="ASSAULT">Assault</SelectItem>
                          <SelectItem value="ACCIDENT">Accident</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Incident Date & Time *
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.incidentDateTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, incidentDateTime: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Incident Location
                    </label>
                    <Input
                      placeholder="Enter location details or coordinates"
                      value={formData.incidentLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentLocation: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Incident Description *
                    </label>
                    <Textarea
                      placeholder="Provide detailed description of the incident"
                      value={formData.incidentDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, incidentDescription: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complainant Name *
                      </label>
                      <Input
                        value={formData.complainantName}
                        onChange={(e) => setFormData(prev => ({ ...prev, complainantName: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        value={formData.complainantPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, complainantPhone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <Textarea
                      placeholder="Enter full address"
                      value={formData.complainantAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, complainantAddress: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  {/* Witnesses Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Witnesses (Optional)
                      </label>
                      <Button variant="outline" size="sm" onClick={addWitness}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Witness
                      </Button>
                    </div>

                    {formData.witnesses.map((witness, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Witness {index + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWitness(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Full Name"
                            value={witness.name}
                            onChange={(e) => updateWitness(index, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="Phone Number"
                            value={witness.phone || ''}
                            onChange={(e) => updateWitness(index, 'phone', e.target.value)}
                          />
                        </div>
                        <div className="mt-2">
                          <Textarea
                            placeholder="Witness Statement (Optional)"
                            value={witness.statement || ''}
                            onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={generateEFIR}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4 mr-2" />
                          Generate E-FIR
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'view' && (
            <div className="space-y-4">
              {existingEFIRs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No E-FIRs Found</h3>
                  <p className="text-gray-600">You haven't created any E-FIRs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {existingEFIRs.map((efir) => (
                    <div key={efir.id} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-semibold text-sm">{efir.fir_number}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(efir.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            efir.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' :
                            efir.status === 'UNDER_INVESTIGATION' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {efir.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-700 mb-3">
                        <strong>Type:</strong> {efir.incident_type.replace('_', ' ')}<br />
                        <strong>Description:</strong> {efir.incident_description.substring(0, 100)}...
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadEFIR(efir.id, efir.fir_number)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>

                        {efir.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => submitEFIR(efir.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
