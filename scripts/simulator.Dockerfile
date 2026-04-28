FROM curlimages/curl:8.7.1
WORKDIR /app
COPY --chmod=0755 simulator-loop.sh /app/simulator-loop.sh
CMD ["/bin/sh", "/app/simulator-loop.sh"]