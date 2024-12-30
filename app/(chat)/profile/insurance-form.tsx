"use client"

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getInsurancePlans, updateInsurance } from "./actions";
import type { InsuranceCompany, InsurancePlan } from "@/lib/db/schema";

interface InsuranceFormProps {
  companies: InsuranceCompany[];
  currentInsurance: {
    companyId: string;
    planId: string;
    detailsJson?: {
      medicalBills?: { date: string; amount: string; description: string }[];
      transcripts?: { date: string; notes: string }[];
    };
  } | null;
}

interface MedicalBill {
  date: string;
  amount: string;
  description: string;
}

interface Transcript {
  date: string;
  notes: string;
}

export default function InsuranceForm({ companies, currentInsurance }: InsuranceFormProps) {
  const [selectedCompany, setSelectedCompany] = useState(currentInsurance?.companyId || "");
  const [selectedPlan, setSelectedPlan] = useState(currentInsurance?.planId || "");
  const [availablePlans, setAvailablePlans] = useState<InsurancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Details state
  const [medicalBills, setMedicalBills] = useState<MedicalBill[]>(
    currentInsurance?.detailsJson?.medicalBills || [{ date: "", amount: "", description: "" }]
  );
  const [transcripts, setTranscripts] = useState<Transcript[]>(
    currentInsurance?.detailsJson?.transcripts || [{ date: "", notes: "" }]
  );

  useEffect(() => {
    if (selectedCompany) {
      const loadPlans = async () => {
        const plans = await getInsurancePlans(selectedCompany);
        setAvailablePlans(plans);
      };
      loadPlans();
    } else {
      setAvailablePlans([]);
    }
  }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !selectedPlan) return;

    setIsLoading(true);
    try {
      const detailsJson = {
        medicalBills: medicalBills.filter(bill => bill.date || bill.amount || bill.description),
        transcripts: transcripts.filter(transcript => transcript.date || transcript.notes)
      };

      await updateInsurance(selectedCompany, selectedPlan, detailsJson);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update insurance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMedicalBill = () => {
    setMedicalBills([...medicalBills, { date: "", amount: "", description: "" }]);
  };

  const updateMedicalBill = (index: number, field: keyof MedicalBill, value: string) => {
    const newBills = [...medicalBills];
    newBills[index] = { ...newBills[index], [field]: value };
    setMedicalBills(newBills);
  };

  const addTranscript = () => {
    setTranscripts([...transcripts, { date: "", notes: "" }]);
  };

  const updateTranscript = (index: number, field: keyof Transcript, value: string) => {
    const newTranscripts = [...transcripts];
    newTranscripts[index] = { ...newTranscripts[index], [field]: value };
    setTranscripts(newTranscripts);
  };

  if (!isEditing && currentInsurance?.detailsJson) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Insurance Details</h2>
          <Button onClick={() => setIsEditing(true)}>Edit Details</Button>
        </div>

        {currentInsurance.detailsJson.medicalBills?.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Medical Bills</h3>
              <div className="space-y-4">
                {currentInsurance.detailsJson.medicalBills.map((bill, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p>{new Date(bill.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p>{bill.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p>{bill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {currentInsurance.detailsJson.transcripts?.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Medical Transcripts</h3>
              <div className="space-y-4">
                {currentInsurance.detailsJson.transcripts.map((transcript, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p>{new Date(transcript.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap">{transcript.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="text-sm font-medium" htmlFor="company">Insurance Company</label>
        <Select
          name="company"
          value={selectedCompany}
          onValueChange={(value) => {
            setSelectedCompany(value);
            setSelectedPlan("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium" htmlFor="plan">Insurance Plan</label>
        <Select
          name="plan"
          value={selectedPlan}
          onValueChange={setSelectedPlan}
          disabled={!selectedCompany || availablePlans.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select plan" />
          </SelectTrigger>
          <SelectContent>
            {availablePlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} ({plan.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Medical Bills</h3>
        {medicalBills.map((bill, index) => (
          <div key={index} className="grid grid-cols-3 gap-4">
            <Input
              type="date"
              value={bill.date}
              onChange={(e) => updateMedicalBill(index, "date", e.target.value)}
              placeholder="Date"
            />
            <Input
              type="text"
              value={bill.amount}
              onChange={(e) => updateMedicalBill(index, "amount", e.target.value)}
              placeholder="Amount"
            />
            <Input
              type="text"
              value={bill.description}
              onChange={(e) => updateMedicalBill(index, "description", e.target.value)}
              placeholder="Description"
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addMedicalBill}>
          Add Medical Bill
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Medical Transcripts</h3>
        {transcripts.map((transcript, index) => (
          <div key={index} className="space-y-2">
            <Input
              type="date"
              value={transcript.date}
              onChange={(e) => updateTranscript(index, "date", e.target.value)}
              placeholder="Date"
            />
            <Textarea
              value={transcript.notes}
              onChange={(e) => updateTranscript(index, "notes", e.target.value)}
              placeholder="Notes"
              className="h-24"
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addTranscript}>
          Add Transcript
        </Button>
      </div>

      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={!selectedCompany || !selectedPlan || isLoading}
          className="flex-1"
        >
          {isLoading ? "Saving..." : "Save Insurance"}
        </Button>
        {currentInsurance && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}