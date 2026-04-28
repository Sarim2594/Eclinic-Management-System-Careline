exports.up = (pgm) => {
  pgm.addColumns('app_users', {
    last_seen_at: {
      type: 'timestamptz',
      notNull: false,
    },
  });

  pgm.sql('CREATE INDEX IF NOT EXISTS app_users_last_seen_at_idx ON app_users (last_seen_at DESC);');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS app_users_last_seen_at_idx;');
  pgm.dropColumns('app_users', ['last_seen_at']);
};
