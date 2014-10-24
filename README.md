# migrat-postgres

A PostgreSQL adapter for [Migrat](https://github.com/naturalatlas/migrat).

- Implements global locking.
- Implements global migration state storage, retrieval. 
- Write migrations in pure PSQL.

```sh
$ npm install migrat-postgres --save
```

## Configuration (migrat.config.js)

```js
var postgres = require('migrat-postgres');

module.exports = {
    plugins: [
        postgres({
            username: 'yourusername',
            password: 'yourpassword',
            database: 'yourdatabase',
            migratSchema: 'public',
            migratTable: 'migrat',
            enableLocking: true,
            enableStateStorage: true
        })
    ]
};
```

## Creating Migrations

```
migrat create <name> --type=psql
```

This will create a SQL file in the migrations directory that you can write normal SQL in – just don't remove the comments:

```sql
-- up:
CREATE TABLE user (
    id serial,
    username text
);

-- down:
DROP TABLE IF EXISTS user;

-- check:
SELECT EXISTS(
    SELECT * 
    FROM information_schema.tables 
    WHERE 
        table_schema = 'public' AND 
        table_name = 'user'
);
```

## License

Copyright &copy; 2014 [Brian Reavis](https://github.com/brianreavis) & [Contributors](https://github.com/naturalatlas/migrat-postgres/graphs/contributors)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.