var fs = require('fs');
var path = require('path');

var args = process.argv.slice(2);
if (args.length != 3) {
    console.log("missing arguments");
    process.exit(1);
}

var dir_path = args[0];
var token1 = args[1];
var token2 = args[2];

fs.readdir(dir_path, (err1, files) => {
    if (err1) return console.log("cannot read directory", err1);
    files.forEach(filename => {
        filename = `${filename}`;
        if (filename[0] == '.') return;

        // if (filename.includes(" - ")) {

        //     var num = `${parseInt(filename[0] + filename[1])}`;
        //     if (num.length < 2) num = `0${num}`;

        //     files.forEach(filename2 => {
        //         filename2 = `${filename2}`;
        //         if (filename2[0] == '.') return;

        //         if (filename2.includes(`how.i.met.your.mother.3${num}`)) {
        //             var filename_new = `${path.basename(filename, path.extname(filename))}${path.extname(filename2)}`;
        //             // console.log(filename_new);
        //             fs.rename(path.join(dir_path, filename2), path.join(dir_path, filename_new), err2 => {
        //                 if (err2) return console.log(`cannot rename file ${filename2}`, err2);
        //                 else console.log(`${filename2} (${filename_new})`);
        //             });
        //         }
        //     });
        // }

        if (filename.includes(token1)) {
            var filename_new = filename.replace(token1, token2);

            // var filename_new = filename;
            // var num = `${parseInt(filename_new[0] + filename_new[1]) - 12}`;
            // if (num.length < 2) num = `0${num}`;
            // filename_new = `${num}${filename_new.slice(2)}`;

            fs.rename(path.join(dir_path, filename), path.join(dir_path, filename_new), err2 => {
                if (err2) return console.log(`cannot rename file ${filename}`, err2);
                else console.log(`${filename_new} (${filename})`);
            });

        } else console.log(filename);
    });
});
