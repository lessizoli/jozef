'use client';

import { useEffect } from 'react';
import { translateText, useI18n } from '@/lib/i18n';

function translateNode(root: Node, language: 'hu' | 'de') {
  if (root instanceof Text) {
    const raw = root.data;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const translated = translateText(trimmed, language);
    if (translated !== trimmed) root.data = raw.replace(trimmed, translated);
    return;
  }
  if (!(root instanceof Element)) return;
  if ((root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) && root.placeholder) root.placeholder = translateText(root.placeholder, language);
  for (const attribute of ['aria-label', 'title']) {
    const value = root.getAttribute(attribute);
    if (value) root.setAttribute(attribute, translateText(value, language));
  }
  root.childNodes.forEach((node) => translateNode(node, language));
}

export default function DomTranslator() {
  const { language } = useI18n();
  useEffect(() => {
    translateNode(document.body, language);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') translateNode(mutation.target, language);
      mutation.addedNodes.forEach((node) => translateNode(node, language));
    }));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);
  return null;
}
