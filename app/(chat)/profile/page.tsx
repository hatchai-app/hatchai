// app/(chat)/profile/page.tsx
import { auth } from "@/app/(auth)/auth";
import { getInsuranceCompanies, getCurrentUserInsurance } from "./actions";
import InsuranceForm from "./insurance-form";
import demo from "@/public/images/demo.svg";
import Image from "next/image";

export default async function Profile() {
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please log in to view your profile.</div>;
  }

  const companies = await getInsuranceCompanies();
  const currentInsurance = await getCurrentUserInsurance(session.user.id);

  return (
    <div className="w-full">
      <div className="text-3xl font-[500] tracking-tighter">My Profile</div>

      <div className="my-6">
        {currentInsurance.length > 0 ? (
          <div className="space-y-2">
            <div>
              <div className="text-xl flex items-center gap-2">
                {currentInsurance[0].companyName} -{" "}
                {currentInsurance[0].planName} ({currentInsurance[0].planType})
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="w-full justify-center my-16">
      <Image src={demo} alt="Demo" width={500} height={500} unoptimized className="w-full dark:invert dark:contrast-[0.93] h-[250px]" />
      </div>
      <InsuranceForm
        companies={companies}
        currentInsurance={currentInsurance[0] || null}
      />
    </div>
  );
}
