# Recovery procedure fixture (synthetic)

The proposed `rebuild-index --apply` operation replaces `data/index.json` in place using the last import. It does not create a backup, use a temporary file, or provide rollback. Running it can discard the current index contents. The fixture does not include an executable rebuild command.
