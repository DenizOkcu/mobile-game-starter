import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

from test_tools import m

spec = importlib.util.spec_from_file_location('export_tool', m.ROOT / 'tools/export.py')
export_tool = importlib.util.module_from_spec(spec)
import sys
sys.path.insert(0, str(m.ROOT / 'tools'))
spec.loader.exec_module(export_tool)


class ExportConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / 'client').mkdir()
        (self.root / 'tools').mkdir()
        (self.root / 'project.godot').write_text('[application]\nconfig/name="Test"\n')
        for source, dest in [('.env.example', '.env.example'), ('tools/export_presets.template', 'tools/export_presets.template')]:
            (self.root / dest).write_text((m.ROOT / source).read_text())
        m.init(self.root / '.env')
        self.env = m.read_env(self.root / '.env')

    def test_public_metadata_and_no_signing_secrets_in_generated_files(self):
        self.env.update(APP_VERSION='1.2.3', APP_BUILD_NUMBER='42', IOS_TEAM_ID='TEAM123456',
                        GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD='never-serialize-this-password')
        with patch.object(m, 'ROOT', self.root):
            m.configure(self.env)
        preset = (self.root / 'export_presets.cfg').read_text()
        self.assertIn('version/code=42', preset)
        self.assertIn('application/app_store_team_id="TEAM123456"', preset)
        self.assertIn('application/export_project_only=true', preset)
        self.assertNotIn('never-serialize-this-password', preset)
        self.assertNotIn('never-serialize-this-password', (self.root / 'client/config.json').read_text())
        self.assertNotIn('@ANDROID_OPTIONS@', preset)

    def test_legacy_env_and_asset_boundary(self):
        legacy = {k: v for k, v in self.env.items() if k not in m.EXPORT_OPTIONS and not k.startswith('GODOT_ANDROID_KEYSTORE_')}
        with patch.object(m, 'ROOT', self.root):
            m.validate(legacy)
            m.configure(legacy)
            (self.root / 'icon.png').write_bytes(b'test-only asset path fixture')
            m.configure({**legacy, 'APP_ICON': 'res://icon.png', 'IOS_ICON': 'res://icon.png'})
            self.assertIn('config/icon="res://icon.png"', (self.root / 'project.godot').read_text())
            for path in ['res://missing.png', '/tmp/absolute.png', 'res://../outside.png']:
                with self.assertRaises(ValueError):
                    m.configure({**legacy, 'APP_ICON': path})

    def test_server_payload_excludes_workstation_credentials(self):
        self.env.update(GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD='never-upload-this-password',
                        GODOT_ANDROID_KEYSTORE_RELEASE_PATH='/private/workstation/release.jks')
        payload = m.server_environment(self.env)
        self.assertIn('NAKAMA_SESSION_KEY=', payload)
        for value in ('never-upload', 'KEYSTORE', 'BUNDLE_ID', 'CLIENT_API_URL', '/private/workstation'):
            self.assertNotIn(value, payload)

    def test_export_process_allowlists_signing(self):
        captured = {}
        self.env['GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD'] = 'private-debug-password'
        self.env['GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD'] = 'unneeded-release-password'
        def fake_run(command, **kwargs):
            captured.update(kwargs)
            Path(command[-1]).write_bytes(b'test artifact')
            return SimpleNamespace(returncode=0, stdout='done', stderr='')
        with patch.object(export_tool, 'ROOT', self.root), patch.object(export_tool, 'read_env', return_value=self.env), \
             patch.object(export_tool, 'validate'), patch.object(export_tool, 'configure'), \
             patch.object(export_tool.subprocess, 'run', side_effect=fake_run), \
             patch.object(sys, 'argv', ['export.py', 'android-debug']):
            export_tool.main()
        self.assertEqual(captured['env']['GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD'], 'private-debug-password')
        self.assertNotIn('NAKAMA_SESSION_KEY', captured['env'])
        self.assertNotIn('POSTGRES_PASSWORD', captured['env'])
        self.assertNotIn('GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD', captured['env'])

    def test_production_rejects_root_ssh(self):
        self.env.update(API_DOMAIN='api.my-game.net', CLIENT_API_URL='https://api.my-game.net',
                        TLS_EMAIL='dev@my-game.net', SSH_HOST='game-vps', SSH_USER='root')
        with self.assertRaisesRegex(ValueError, 'non-root'):
            m.validate(self.env, production=True)

    def test_export_error_diagnostics_redact_password(self):
        import io
        from contextlib import redirect_stdout
        self.env['GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD'] = 'private-debug-password'
        result = SimpleNamespace(returncode=1, stdout='ERROR: private-debug-password', stderr='')
        output = io.StringIO()
        with patch.object(export_tool, 'ROOT', self.root), patch.object(export_tool, 'read_env', return_value=self.env), \
             patch.object(export_tool, 'validate'), patch.object(export_tool, 'configure'), \
             patch.object(export_tool.subprocess, 'run', return_value=result), \
             patch.object(sys, 'argv', ['export.py', 'android-debug']), redirect_stdout(output):
            with self.assertRaisesRegex(ValueError, 'verified export'):
                export_tool.main()
        self.assertNotIn('private-debug-password', output.getvalue())
        self.assertIn('[redacted]', output.getvalue())
