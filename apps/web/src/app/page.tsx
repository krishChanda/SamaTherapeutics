"use client";

import { Canvas } from "@/components/canvas";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { GraphProvider } from "@/contexts/GraphContext";
import { ThreadProvider } from "@/contexts/ThreadProvider";
import { UserProvider } from "@/contexts/UserContext";
import { PresentationProvider } from "@/contexts/PresentationContext";
import { MultipleChoiceProvider } from "@/contexts/MultipleChoiceContext"; // Import the MultipleChoiceProvider
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <UserProvider>
        <ThreadProvider>
          <AssistantProvider>
            <GraphProvider>
              <PresentationProvider>
                <MultipleChoiceProvider> {/* Add the MultipleChoiceProvider here */}
                  <Canvas />
                </MultipleChoiceProvider>
              </PresentationProvider>
            </GraphProvider>
          </AssistantProvider>
        </ThreadProvider>
      </UserProvider>
    </Suspense>
  );
}