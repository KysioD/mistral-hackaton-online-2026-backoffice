CREATE OR REPLACE FUNCTION enforce_single_active_system_prompt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.active = true THEN
        UPDATE "SystemPrompt" SET "active" = false WHERE id != NEW.id AND "active" = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_active_system_prompt_trigger
BEFORE INSERT OR UPDATE ON "SystemPrompt"
FOR EACH ROW
EXECUTE FUNCTION enforce_single_active_system_prompt();
