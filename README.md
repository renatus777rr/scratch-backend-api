# Scratch API Backend
backend for frontend scratch-www
this is scratch api i made for scratch-www
requirements:
node.js 18.17.1 (idk about older and newer)
postgresql 13
1. npm install in cmd.
2. create database named scratchapi
3. create these tables:
 public | follows          | table | postgres
 public | loves            | table | postgres
 public | projects         | table | postgres
 public | studio_comments  | table | postgres
 public | studio_curators  | table | postgres
 public | studio_followers | table | postgres
 public | studio_managers  | table | postgres
 public | studio_projects  | table | postgres
 public | studios          | table | postgres
 public | user_follows     | table | postgres
 public | users            | table | postgres
4. create these collumns
follows:
 user_id          | integer |           | not null |
 followed_user_id | integer |           | not null |

users:
 id            | integer                     |           | not null | nextval('users_id_seq'::regclass)
 username      | character varying(50)       |           | not null |
 password_hash | text                        |           |          |
 avatar        | text                        |           |          |
 bio           | text                        |           |          |
 status        | text                        |           |          |
 profile_id    | integer                     |           |          |
 created_at    | timestamp without time zone |           |          | CURRENT_TIMESTAMP
 last_login    | timestamp without time zone |           |          |


projects:
 id               | integer                     |           | not null |
 title            | text                        |           | not null |
 description      | text                        |           |          |
 instructions     | text                        |           |          |
 image            | text                        |           |          |
 author_id        | integer                     |           |          |
 author_username  | text                        |           |          |
 history_created  | timestamp without time zone |           |          |
 history_modified | timestamp without time zone |           |          |
 history_shared   | timestamp without time zone |           |          |
 stats_views      | integer                     |           |          | 0
 stats_loves      | integer                     |           |          | 0
 stats_favorites  | integer                     |           |          | 0
 stats_comments   | integer                     |           |          | 0
 remix_root_id    | integer                     |           |          |


loves:
 user_id    | integer                     |           | not null |
 project_id | integer                     |           | not null |
 created_at | timestamp without time zone |           |          | now()


studios:
 id          | integer                     |           | not null | nextval('studios_id_seq'::regclass)
 title       | text                        |           | not null |
 description | text                        |           |          |
 owner_id    | integer                     |           |          |
 created_at  | timestamp without time zone |           |          | CURRENT_TIMESTAMP

user_follows:
 follower_id | integer                     |           | not null |
 followee_id | integer                     |           | not null |
 followed_at | timestamp without time zone |           |          | now()

studio_projects
 studio_id  | integer                     |           | not null |
 project_id | integer                     |           | not null |
 added_at   | timestamp without time zone |           |          | CURRENT_TIMESTAMP

studio_managers
 studio_id | integer                     |           | not null |
 user_id   | integer                     |           | not null |
 added_at  | timestamp without time zone |           | not null | now()

studio_followers
 user_id     | integer                     |           | not null |
 studio_id   | integer                     |           | not null |
 followed_at | timestamp without time zone |           |          | CURRENT_TIMESTAMP

studio_curators
 studio_id | integer                     |           | not null |
 user_id   | integer                     |           | not null |
 added_at  | timestamp without time zone |           |          | now()


studio_comments (broken table, not needed i think so)
 id         | integer                     |           | not null | nextval('studio_comments_id_seq'::regclass)
 studio_id  | character varying(255)      |           |          |
 user_id    | character varying(255)      |           |          |
 content    | text                        |           |          |
 created_at | timestamp without time zone |           |          | CURRENT_TIMESTAMP

5. after this, create users projects studios. (for projects and studios need user that already in database)
6. i think you understand now, run npm run start
7. alr in scratch-www, webpack-config. we need change in define plugin process.env.API_HOST. 
change it to 'process.env.API_HOST': JSON.stringify('http://localhost:3000'), and save.
8. run npm run start in the scratch-www.
9. be happy, you set up the backend.
the accounts doesnt work, i mean work but really you cant edit projects with account and watch projects/:id 
page.
