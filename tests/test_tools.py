import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('manage', Path(__file__).resolve().parents[1] / 'tools/manage.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ConfigurationTests(unittest.TestCase):
    def test_generated_secrets_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / '.env'
            m.init(path)
            env = m.read_env(path)
            m.validate(env)
            self.assertEqual(len(set(env[k] for k in m.SECRETS)), len(m.SECRETS))
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(ValueError):
                m.init(path)
            with self.assertRaises(ValueError):
                m.validate(env, production=True)
            env.update(API_DOMAIN='api.my-game.net', CLIENT_API_URL='https://api.my-game.net',
                       TLS_EMAIL='dev@my-game.net', SSH_HOST='game-vps')
            m.validate(env, production=True)
            env['LOCAL_BIND_IP'] = '0.0.0.0'
            with self.assertRaises(ValueError):
                m.validate(env, production=True)

    def test_env_does_not_execute_shell(self):
        for text in ['X=$(whoami)', 'X=`whoami`', 'X=one\nX=two', 'not an assignment']:
            with tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'env'
                path.write_text(text)
                with self.assertRaises(ValueError):
                    m.read_env(path)
