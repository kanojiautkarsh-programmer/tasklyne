"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";
import { TIER_DISPLAY_NAMES, type SubscriptionTier } from "@/lib/features";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  feature?: string;
  currentTier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  title = "Upgrade Required",
  description = "This feature is not available on your current plan.",
  feature,
  currentTier,
  requiredTier,
  onUpgrade,
}: UpgradePromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-taskly-orange to-orange-400">
              <Crown className="size-5 text-white" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {feature && (
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Feature you&apos;re trying to use</p>
              <p className="font-medium">{feature}</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-gradient-to-r from-orange-50 to-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-taskly-orange" />
              <span className="text-sm font-medium">Available on</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-taskly-orange text-white">
                {requiredTier ? TIER_DISPLAY_NAMES[requiredTier] : "Pro or higher"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Your plan: {TIER_DISPLAY_NAMES[currentTier]}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button
            className="bg-gradient-to-r from-taskly-orange to-orange-400 hover:from-orange-500 hover:to-orange-500"
            onClick={() => {
              if (onUpgrade) {
                onUpgrade();
              } else {
                window.location.href = "/dashboard/billing";
              }
            }}
          >
            <Crown className="size-4 mr-1" />
            Upgrade Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  currentTier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  children,
  feature,
  currentTier,
  requiredTier,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const tiers: SubscriptionTier[] = ["free", "starter", "pro", "scale"];
  const currentIndex = tiers.indexOf(currentTier);
  const requiredIndex = tiers.indexOf(requiredTier);
  const hasAccess = currentIndex >= requiredIndex;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <UpgradeGate
      title={`${feature} requires a higher plan`}
      description={`Upgrade to access ${feature} and other premium features.`}
      feature={feature}
      currentTier={currentTier}
      requiredTier={requiredTier}
    />
  );
}

export function UpgradeGate(props: Omit<UpgradePromptProps, "open" | "onOpenChange">) {
  const [show, setShow] = useState(true);

  return (
    <UpgradePrompt
      open={show}
      onOpenChange={setShow}
      {...props}
    />
  );
}
