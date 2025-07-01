import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { styled } from 'nativewind';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}) => {
  const baseButtonClasses = "py-3 px-6 rounded-lg items-center justify-center shadow-md";
  const baseTextClasses = "text-base font-semibold";

  let buttonVariantClasses = "";
  let textVariantClasses = "";

  if (disabled) {
    buttonVariantClasses = "bg-gray-300";
    textVariantClasses = "text-gray-500";
  } else if (variant === 'primary') {
    buttonVariantClasses = "bg-blue-500 active:bg-blue-600";
    textVariantClasses = "text-white";
  } else if (variant === 'secondary') {
    buttonVariantClasses = "bg-gray-200 active:bg-gray-300 border border-gray-300";
    textVariantClasses = "text-gray-800";
  }

  return (
    <StyledTouchableOpacity
      onPress={onPress}
      className={`${baseButtonClasses} ${buttonVariantClasses}`}
      style={style}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <StyledText className={`${baseTextClasses} ${textVariantClasses}`} style={textStyle}>
        {title}
      </StyledText>
    </StyledTouchableOpacity>
  );
};

export default StyledButton;
