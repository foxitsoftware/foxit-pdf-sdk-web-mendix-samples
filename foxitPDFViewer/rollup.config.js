import shelljs from "shelljs";
const { cp } = shelljs;
import command from "rollup-plugin-command";
import { join } from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default args => {
    args.configDefaultConfig[args.configDefaultConfig.length - 1].plugins.push(command([
        () => {
            const filePath = '@foxitsoftware/foxit-pdf-sdk-for-web-library';
            let copyTo = 'theme/web/resources/@foxitsoftware/';
            if (!existsSync(join(config.config.projectPath, 'theme/web'))) {
                copyTo = 'theme/resources/@foxitsoftware/';
            }
            copyTo = join(config.config.projectPath, copyTo);

            mkdirSync(copyTo, { recursive: true });
            cp(
                '-R',
                join(__dirname, "node_modules/", filePath),
                copyTo
            );
        }
    ]));

    return args.configDefaultConfig;
}