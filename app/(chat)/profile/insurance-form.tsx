"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getInsurancePlans, updateInsurance } from "./actions";
import type { InsuranceCompany, InsurancePlan } from "@/lib/db/schema";

interface InsuranceFormProps {
  companies: InsuranceCompany[];
  currentInsurance: {
    companyId: string;
    planId: string;
  } | null;
}

export default function InsuranceForm({ companies, currentInsurance }: InsuranceFormProps) {
  const [selectedCompany, setSelectedCompany] = useState(currentInsurance?.companyId || "");
  const [selectedPlan, setSelectedPlan] = useState(currentInsurance?.planId || "");
  const [availablePlans, setAvailablePlans] = useState<InsurancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      await updateInsurance(selectedCompany, selectedPlan);
    } catch (error) {
      console.error("Failed to update insurance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
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

      <div className="space-y-2">
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
      <div className="h-2 w-full" />
      <Button 
        type="submit" 
        disabled={!selectedCompany || !selectedPlan || isLoading}
      >
        {isLoading ? "Saving..." : "Save Insurance"}
      </Button>
    </form>
  );
}