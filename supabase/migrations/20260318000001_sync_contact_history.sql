-- Aggiorna i campi last_contact_date e last_contact_method nella tabella saved_clients
-- basandosi sulla cronologia esistente in contact_history.
-- Questa migrazione sincronizza i dati se i campi nella tabella principale sono diventati nulli.

UPDATE saved_clients sc
SET 
  last_contact_date = ch.latest_date,
  last_contact_method = ch.latest_method
FROM (
  SELECT DISTINCT ON (client_id) 
    client_id, 
    contact_date as latest_date, 
    contact_method as latest_method
  FROM contact_history
  ORDER BY client_id, contact_date DESC
) ch
WHERE sc.id = ch.client_id;
