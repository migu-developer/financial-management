import { Section, Text } from '@react-email/components';

interface VerificationCodeBlockProps {
  label: string;
  code?: string;
  hint?: string;
}

export function VerificationCodeBlock({
  label,
  code,
  hint,
}: VerificationCodeBlockProps) {
  return (
    <Section className="bg-primary-pale rounded-2xl py-6 px-6 my-6 text-center border border-primary-light">
      <Text className="text-neutral-600 text-sm font-medium m-0 mb-1">
        {label}
      </Text>
      <Text className="text-primary-dark text-4xl font-bold my-2 mx-0 tracking-widest">
        {code}
      </Text>
      {hint ? (
        <Text className="text-neutral-500 text-xs m-0 mt-1">{hint}</Text>
      ) : null}
    </Section>
  );
}
