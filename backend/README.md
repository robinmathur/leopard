### Make migration scripts

```sh {"id":"01J1JQW3ZDA9GZRGM6X77JB3YK"}
python manage.py makemigrations
```

### Run migrate script for database

```sh {"id":"01J1JQW3ZDA9GZRGM6X7VR50EB"}
python manage.py migrate
```

### Run server

```sh {"id":"01J1JQW3ZDA9GZRGM6XATJS720"}
python manage.py runserver
```

### Create a new app in django

```sh {"id":"01J1JQW3ZDA9GZRGM6XC6ZKJBN"}
python manage.py startapp <app-name>
```

### Create admin user for django rest

```sh {"id":"01J1JQW3ZDA9GZRGM6XEZ2BPG7"}
python manage.py createsuperuser --username admin --email admin@upright.com
```

### Continuous Deployment with Github actions on aws EC2 instance
Follow this - 
https://gist.github.com/rmiyazaki6499/92a7dc283e160333defbae97447c5a83#setting-up-continuous-deployment

Pass environment variable to django

    DB_PASSWORD="xyz" ./manage.py runserver


#### Rest Service login url
 /api-auth/login

/api-auth/logout