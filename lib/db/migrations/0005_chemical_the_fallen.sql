CREATE TABLE IF NOT EXISTS "InsuranceCompany" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "InsurancePlan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"companyId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserInsurance" (
	"userId" uuid NOT NULL,
	"planId" uuid NOT NULL,
	"memberId" varchar(255),
	"groupId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserInsurance_userId_planId_pk" PRIMARY KEY("userId","planId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InsurancePlan" ADD CONSTRAINT "InsurancePlan_companyId_InsuranceCompany_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."InsuranceCompany"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInsurance" ADD CONSTRAINT "UserInsurance_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserInsurance" ADD CONSTRAINT "UserInsurance_planId_InsurancePlan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."InsurancePlan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
