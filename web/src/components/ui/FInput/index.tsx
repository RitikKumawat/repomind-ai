import { TextInput, TextInputProps } from '@mantine/core';

export function FInput(props: TextInputProps) {
  return (
    <TextInput
      radius="md"
      {...props}
    />
  );
}
