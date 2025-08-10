import { useState, useRef, useEffect } from 'react';

export const usePickupTimer = () => {
    const [pickupTimer, setPickupTimer] = useState(0);
    const pickupTimerInterval = useRef<number | null>(null);

    const startTimer = () => {
        let seconds = 0;
        pickupTimerInterval.current = setInterval(() => {
            seconds++;
            setPickupTimer(seconds);
        }, 1000) as unknown as number;
    };

    const stopTimer = () => {
        if (pickupTimerInterval.current) {
            clearInterval(pickupTimerInterval.current);
            pickupTimerInterval.current = null;
        }
        setPickupTimer(0);
    };

    const formatTimer = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => stopTimer();
    }, []);

    return { pickupTimer, startTimer, stopTimer, formatTimer };
};