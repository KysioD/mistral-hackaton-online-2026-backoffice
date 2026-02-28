CREATE OR REPLACE FUNCTION ensure_always_active_system_prompt()
RETURNS TRIGGER AS $$
DECLARE
    active_count INT;
    fallback_id TEXT;
BEGIN
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

CREATE TRIGGER ensure_active_system_prompt_trigger
AFTER INSERT OR UPDATE OR DELETE ON "SystemPrompt"
FOR EACH STATEMENT
EXECUTE FUNCTION ensure_always_active_system_prompt();
