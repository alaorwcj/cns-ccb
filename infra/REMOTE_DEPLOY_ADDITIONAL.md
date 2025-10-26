Automated backups
------------------

Adicionei um script de backup em `infra/backup/backup.sh` que:

- executa `pg_dump -Fc ccb` e `pg_dumpall -g` dentro do container `db` (via `docker exec`);
- copia os artefatos para `infra/backups` no repositório;
- define permissões seguras e remove arquivos temporários do container;
- por padrão mantém 14 dias de backups (variável `KEEP_DAYS` para ajustar).

Uso manual do script (no host remoto):

```bash
cd /root/app/cns-ccb
./infra/backup/backup.sh
```

Exemplo de cron (diariamente às 02:00 UTC):

```cron
0 2 * * * cd /root/app/cns-ccb && ./infra/backup/backup.sh >> /var/log/ccb_backup.log 2>&1
```

Notas de segurança e permissões
- O usuário que instalar o cron precisa ter permissão para rodar `docker` (geralmente `root` ou membro do grupo `docker`).
- Os dumps são gravados em `infra/backups` no repositório; ajuste a política de retenção conforme necessário e considere copiar para armazenamento externo seguro.

Próximos passos relacionados a backups
- Verificar rotina de logs: redirecionar a saída para `/var/log/ccb_backup.log` e configurar logrotate se for manter por muito tempo.
- (Opcional) Copiar backups para um S3 compatible bucket ou host remoto com rsync.
