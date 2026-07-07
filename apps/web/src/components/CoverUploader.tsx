import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { BookIcon } from './icons';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

/** Book-cover aspect plate — the campaign's face. */
const Plate = styled.button<{ $hasImage: boolean }>`
  position: relative;
  width: 100%;
  max-width: 260px;
  aspect-ratio: 3 / 4;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px ${({ $hasImage }) => ($hasImage ? 'solid' : 'dashed')}
    ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  overflow: hidden;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.danger};
  text-align: center;
`;

const Actions = styled.div`
  display: flex;
  justify-content: center;
`;

interface CoverUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

/**
 * Cover image picker with live preview and removal. Validates type (JPG/PNG/
 * WEBP) and size (≤5MB) client-side. Works with a thumb on mobile — the whole
 * plate is the tap target.
 */
export function CoverUploader({ value, onChange }: CoverUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = () => inputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError(t('campaign.cover.errorType'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('campaign.cover.errorSize'));
      return;
    }
    setError(null);
    onChange(file);
  };

  const remove = () => {
    setError(null);
    onChange(null);
  };

  return (
    <Frame>
      <Plate type="button" onClick={pick} $hasImage={!!preview} aria-label={t('campaign.cover.add')}>
        {preview ? (
          <img src={preview} alt={t('campaign.cover.previewAlt')} />
        ) : (
          <>
            <BookIcon size={30} />
            <Hint>{t('campaign.cover.add')}</Hint>
          </>
        )}
      </Plate>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={onFile}
        hidden
      />
      {error ? <ErrorText>{error}</ErrorText> : <Hint>{t('campaign.cover.hint')}</Hint>}
      {value && (
        <Actions>
          <Button variant="ghost" size="sm" onClick={remove}>
            {t('campaign.cover.remove')}
          </Button>
        </Actions>
      )}
    </Frame>
  );
}
