FROM curlimages/curl:8.7.1
WORKDIR /app
COPY simulator-loop.sh /app/simulator-loop.sh
RUN chmod +x /app/simulator-loop.sh
CMD ["/bin/sh", "/app/simulator-loop.sh"]