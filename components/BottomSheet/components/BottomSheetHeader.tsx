import React from 'react';
import { View, PanResponderInstance } from 'react-native';

interface BottomSheetHeaderProps {
    panHandlers: PanResponderInstance['panHandlers'];
}

export const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({ panHandlers }) => {
    return (
        <View {...panHandlers} style={{ padding: 16 }}>
            <View style={{
                width: 40,
                height: 4,
                backgroundColor: '#E0E0E0',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16
            }} />
        </View>
    );
};