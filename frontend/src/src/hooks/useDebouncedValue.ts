// Hook que atrasa a atualização de um valor por `delay` ms (debounce)
// Evita processamento excessivo em inputs de busca e filtros
import { useState, useEffect } from 'react';

/**
 * Retorna uma versão "debounced" do valor fornecido.
 * O valor só é atualizado após `delay` ms sem novas chamadas.
 *
 * @param value  Valor a ser debounced
 * @param delay  Tempo de espera em ms (padrão: 300)
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
