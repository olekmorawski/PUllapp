import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle; // Allow passing additional styles
  textStyle?: TextStyle; // Allow passing additional text styles
  className?: string; // Allow passing additional Tailwind classes for the button
  textClassName?: string; // Allow passing additional Tailwind classes for the text
  disabled?: boolean;
}

const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  className = '',
  textClassName = '',
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
    buttonVariantClasses = "bg-blue-500";
    textVariantClasses = "text-white";
  } else if (variant === 'secondary') {
    buttonVariantClasses = "bg-gray-200 border border-gray-300";
    textVariantClasses = "text-gray-800";
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${baseButtonClasses} ${buttonVariantClasses} ${className}`}
      style={style} // Pass through any custom ViewStyle props
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text className={`${baseTextClasses} ${textVariantClasses} ${textClassName}`} style={textStyle}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default StyledButton;
