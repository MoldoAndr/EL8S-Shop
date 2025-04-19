# Dockerfile pentru Apache
FROM httpd:2.4

# Asigurăm-ne că directorul logs există
RUN mkdir -p /usr/local/apache2/logs

# Copierea configurării Apache
COPY apache-conf.conf /usr/local/apache2/conf/extra/apache-chat.conf

# Activarea modulelor necesare și includerea configurației
RUN echo "Include conf/extra/apache-chat.conf" >> /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule proxy_module/LoadModule proxy_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule proxy_http_module/LoadModule proxy_http_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule proxy_wstunnel_module/LoadModule proxy_wstunnel_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule proxy_balancer_module/LoadModule proxy_balancer_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule slotmem_shm_module/LoadModule slotmem_shm_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule lbmethod_byrequests_module/LoadModule lbmethod_byrequests_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule rewrite_module/LoadModule rewrite_module/g' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule headers_module/LoadModule headers_module/g' /usr/local/apache2/conf/httpd.conf

# Expunerea portului 80
EXPOSE 80

CMD ["httpd-foreground"]
