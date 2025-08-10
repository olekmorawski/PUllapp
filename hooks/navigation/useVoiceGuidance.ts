import { useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';
import {VOICE_OPTIONS} from "@/hooks/navigation/types";

export const useVoiceGuidance = (isMuted: boolean) => {
    const lastSpokenInstructionRef = useRef<string>('');

    const speakInstruction = useCallback(async (text: string) => {
        if (isMuted || !text || text === lastSpokenInstructionRef.current) {
            return;
        }

        try {
            await Speech.stop();
            await Speech.speak(text, VOICE_OPTIONS);
            lastSpokenInstructionRef.current = text;
        } catch (error) {
            console.warn('Speech error:', error);
        }
    }, [isMuted]);

    return { speakInstruction };
};
