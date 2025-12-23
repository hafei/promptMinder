import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function usePromptDetail(id) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [variableValues, setVariableValues] = useState({});
  const [hasVariables, setHasVariables] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const loadPrompt = async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/prompts/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to load prompt ${id}`);
        }

        const data = await response.json();
        if (cancelled) return;

        const normalizedPrompt = {
          ...data,
          tags: Array.isArray(data.tags)
            ? data.tags
            : (data.tags || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
        };

        setPrompt(normalizedPrompt);
        setSelectedVersion(normalizedPrompt.version);

        try {
          // Use the new versions API endpoint that respects team separation
          const versionsResponse = await fetch(`/api/prompts/${id}/versions`);
          if (!versionsResponse.ok) {
            throw new Error(`Failed to load versions for prompt ${id}`);
          }

          const versions = await versionsResponse.json();

          if (cancelled) return;

          // Sort versions by creation date (newest first)
          const sorted = versions.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setVersions(sorted);
        } catch (error) {
          if (!cancelled) {
            console.error('Error fetching versions:', error);
            setVersions([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching prompt:', error);
          setVersions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPrompt();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleVersionChange = (version) => {
    const selectedPrompt = versions.find(v => v.version === version);
    if (selectedPrompt) {
      router.push(`/prompts/${selectedPrompt.id}`);
    }
  };

  const handleVariablesChange = (values, hasVars) => {
    setVariableValues(values);
    setHasVariables(hasVars);
  };

  const updatePrompt = (updatedPrompt) => {
    setPrompt(updatedPrompt);
  };

  return {
    prompt,
    versions,
    selectedVersion,
    variableValues,
    hasVariables,
    isLoading,
    handleVersionChange,
    handleVariablesChange,
    updatePrompt
  };
}
