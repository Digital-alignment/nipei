import fs from "node:fs";
import path from "node:path";

const p = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment\\Clientes\\nipeihu.md";
if (fs.existsSync(p)) {
  console.log("fs.realpathSync.native:", fs.realpathSync.native(p));
}
