import React, { useCallback, useEffect, useRef, useState } from "react";
import AvoFAB from "./AvoFAB";
import AvoBubble from "./AvoBubble";
import type { useAvoHelper } from "../../hooks/useAvoHelper";
import type { AvoCardContext, AvoChipType } from "@/types/schemas/api/avoHelper";

interface AvoHelperOverlayProps {
  cardContext: AvoCardContext | null;
  avoHelper: ReturnType<typeof useAvoHelper>;
}

// Czas w milisekundach (3 minuty = 180000, dla testów dajemy 10s)
const BUBBLE_INTERVAL = 3 * 60 * 1000; 
const BUBBLE_VISIBLE_DURATION = 6000; // Dymek znika po 6 sekundach


export default function AvoHelperOverlay({
  cardContext,
  avoHelper,
}: AvoHelperOverlayProps): React.JSX.Element {

  const modalRef = useRef<ReturnType<typeof useAvoHelper>>(null);

  useEffect(() => {
    modalRef.current = avoHelper;
  }, [avoHelper]);

  const [showBubble, setShowBubble] = useState(false);

  const handleChipPress = useCallback(
    (chipType: AvoChipType, customQuestion?: string) => {
      if (!cardContext) return;
      avoHelper.sendQuery(chipType, cardContext, customQuestion);
    },
    [cardContext, avoHelper.sendQuery]
  );


  const triggerInteraction = () => {
    if(modalRef.current?.isOpen || modalRef.current?.isLoading) return;
    setShowBubble(true);

    setTimeout(() => {
      setShowBubble(false);
    }, BUBBLE_VISIBLE_DURATION);
  };

    // 3. Logika Dymka (Interwał)
    useEffect(() => {
      const timer = setInterval(() => {
        triggerInteraction();
      }, BUBBLE_INTERVAL);
  
      // Opcjonalnie: wywołaj raz na start po 5 sekundach, żeby użytkownik zobaczył efekt
      const initialTimer = setTimeout(() => triggerInteraction(), 5000);
  
      return () => {
        clearInterval(timer);
        clearTimeout(initialTimer);
      };
    }, []);

  return (
    <>
      <AvoFAB onPress={avoHelper.toggle} mood={avoHelper.mood} showBubble={showBubble} />
      <AvoBubble
        visible={avoHelper.isOpen}
        onClose={avoHelper.close}
        messages={avoHelper.messages}
        isLoading={avoHelper.isLoading}
        isLimitReached={avoHelper.isLimitReached}
        remainingQueries={avoHelper.remainingQueries}
        onChipPress={handleChipPress}
      />
    </>
  );
}
