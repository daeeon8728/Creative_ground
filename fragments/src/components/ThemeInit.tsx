// Injects a blocking script to prevent flash of unstyled content for dark mode
export function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var stored = localStorage.getItem('theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var isDark = stored ? stored === 'dark' : prefersDark;
              if (isDark) document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `,
      }}
    />
  );
}
