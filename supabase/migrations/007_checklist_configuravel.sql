-- Migration 007 — Checklist de publicação configurável
-- Atualiza o trigger para ler itens de configuracoes
-- em vez de usar lista hardcoded.
--
-- Categorias usadas:
--   checklist_setup, checklist_desenvolvimento,
--   checklist_testes, checklist_performance
--
-- A fase é extraída removendo o prefixo 'checklist_'.

CREATE OR REPLACE FUNCTION criar_checklist_implementada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_checklist_id UUID;
BEGIN
    IF NEW.status = 'Implementada' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'Implementada') THEN
        IF NOT EXISTS (SELECT 1 FROM checklists_publicacao WHERE pagina_id = NEW.id) THEN
            INSERT INTO checklists_publicacao (pagina_id)
            VALUES (NEW.id)
            RETURNING id INTO v_checklist_id;

            INSERT INTO checklist_itens (checklist_id, fase, item, ordem)
            SELECT
                v_checklist_id,
                REPLACE(c.categoria, 'checklist_', ''),
                c.valor,
                c.ordem
            FROM configuracoes c
            WHERE c.categoria IN (
                'checklist_setup',
                'checklist_desenvolvimento',
                'checklist_testes',
                'checklist_performance'
            )
            AND c.ativo = true
            ORDER BY c.categoria, c.ordem;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
