import { Button, ButtonProps, createPolymorphicComponent } from '@mantine/core';
import { forwardRef } from 'react';

const _FButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => (
    <Button
      radius="md"
      fw={600}
      ref={ref}
      {...props}
    />
  )
);

_FButton.displayName = 'FButton';

export const FButton = createPolymorphicComponent<'button', ButtonProps>(_FButton);
