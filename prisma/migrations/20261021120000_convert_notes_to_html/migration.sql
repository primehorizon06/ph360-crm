UPDATE "Note"
SET "content" = regexp_replace(
  '<p>' || replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace("content", E'\r\n', E'\n'),
              '&', '&amp;'
            ),
            '<', '&lt;'
          ),
          '>', '&gt;'
        ),
        '"', '&quot;'
      ),
      '''', '&#39;'
    ),
    E'\n', '</p><p>'
  ) || '</p>',
  '(<p></p>)+$',
  ''
);
