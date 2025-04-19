FROM mongo:latest
COPY init-mongo.js /docker-entrypoint-initdb.d/
EXPOSE 27017
VOLUME ["/data/db"]
CMD ["mongod"]
