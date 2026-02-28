CREATE OR REPLACE FUNCTION ensure_always_active_system_prompt()
RETURNS TRIGGER AS $$
DECLARE
    active_count INT;
    fallback_id TEXT;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;

    SELECT count(*) INTO active_count FROM "SystemPrompt" WHERE "active" = true;
    
    IF active_count = 0 THEN
        SELECT id INTO fallback_id FROM "SystemPrompt" ORDER BY "createdAt" DESC LIMIT 1;
        
        IF fallback_id IS NOT NULL THEN
            UPDATE "SystemPrompt" SET "active" = true WHERE id = fallback_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_single_active_system_prompt()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.active = true THEN
        UPDATE "SystemPrompt" SET "active" = false WHERE id != NEW.id AND "active" = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
