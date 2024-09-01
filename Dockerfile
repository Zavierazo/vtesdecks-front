# build angular
FROM node:lts-alpine as build
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build --omit=dev

# build sitemap
FROM python:alpine as sitemap
COPY /sitemap_generator .
RUN pip install -r requirements.txt
RUN python sitemap_generator.py

# compose nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist/vtesDecksFront /usr/share/nginx/html
COPY --from=sitemap /sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY /nginx.conf  /etc/nginx/conf.d/default.conf
