#!/bin/bash
cd sportsdeck-app

npm install

npx prisma generate

npx prisma migrate deploy

npx prisma generate

npx prisma db seed

