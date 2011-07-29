// Application bootstrap. Ensures that files directories exist at server start.
var fs = require('fs'),
    path = require('path'),
    Step = require('step');

function mkdirpSync(p) {
    var ps = path.normalize(p).split('/');
    var created = [];
    while (ps.length) {
        created.push(ps.shift());
        if (created.length > 1 && !path.existsSync(created.join('/'))) {
            var err = fs.mkdirSync(created.join('/'), 0755);
            if (err) return err;
        }
    }
};

module.exports = function(app, settings) {
    try {
        fs.statSync(settings.tilemill_home);
    } catch (Exception) {
        console.log('Creating tilemill base directory: %s', settings.tilemill_home);
        mkdirpSync(settings.tilemill_home, 0777);
    }

    try {
        fs.statSync(settings.files);
    } catch (Exception) {
        console.log('Creating files dir %s', settings.files);
        fs.mkdirSync(settings.files, 0777);
    }

    try {
        fs.statSync(settings.mapfile_dir);
    } catch (Exception) {
        console.log('Creating mapfile dir %s', settings.mapfile_dir);
        fs.mkdirSync(settings.mapfile_dir, 0777);
    }

    try {
        fs.statSync(settings.data_dir);
    } catch (Exception) {
        console.log('Creating data dir %s', settings.data_dir);
        fs.mkdirSync(settings.data_dir, 0777);
    }

    try {
        fs.statSync(settings.export_dir);
    } catch (Exception) {
        console.log('Creating export dir %s', settings.export_dir);
        fs.mkdirSync(settings.export_dir, 0777);
    }
    
    try {
        fs.statSync(settings.local_data);
    } catch (Exception) {
        console.log('Creating local data dir %s', settings.local_data);
        fs.mkdirSync(settings.local_data, 0777);
    }
    
    // @TODO: Better infrastructure for handling updates.

    // Update 1: Migrate to new backbone-dirty key format.
    try {
        var db = fs.readFileSync(settings.files + '/app.db', 'utf8');
        if (db && db.match(/{"key":"(export|library|settings):/g)) {
            db = db.replace(/{"key":"export:/g, '{"key":"api/Export/');
            db = db.replace(/{"key":"library:/g, '{"key":"api/Library/');
            db = db.replace(/{"key":"settings:/g, '{"key":"api/Settings/');
            fs.writeFileSync(settings.files + '/app.db', db);
            console.log('Update: Migrated to new backbone-dirty key format.');
        }
    } catch (Exception) {}

    // Apply server-side mixins/overrides.
    require('backbone-dirty')(settings.files + '/app.db');
    require('models-server');

    // Create a default library for the local data directory.
    var models = require('models');
    var data = new models.Library({
        id: 'data',
        name: 'Local data',
        type: 'directory'
    });
    Step(
        function() {
            data.fetch({ success: this, error: this });
        },
        function() {
            if (!data.get('directory_path')) {
                data.save({
                    'directory_path': settings.local_data
                });
            }
        }
    );
}

