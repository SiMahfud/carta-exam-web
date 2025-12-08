# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e9]
      - generic [ref=e12]: Selamat Datang
      - generic [ref=e13]:
        - text: Masuk untuk mengakses sistem ujian
        - text: SMAN 1 Campurdarat
    - generic [ref=e14]:
      - generic [ref=e15]:
        - alert [ref=e16]:
          - img [ref=e17]
          - generic [ref=e19]: Username atau password salah
        - generic [ref=e20]:
          - text: Username
          - generic [ref=e21]:
            - img [ref=e22]
            - textbox "Username" [ref=e25]:
              - /placeholder: Masukkan username
              - text: admin
        - generic [ref=e26]:
          - text: Password
          - generic [ref=e27]:
            - img [ref=e28]
            - textbox "Password" [ref=e31]:
              - /placeholder: ••••••••
              - text: password123
            - button "Tampilkan password" [ref=e32] [cursor=pointer]:
              - img [ref=e33]
      - generic [ref=e36]:
        - button "Masuk" [ref=e37] [cursor=pointer]
        - paragraph [ref=e38]: Lupa password? Hubungi administrator sekolah.
        - link "Kembali ke Beranda" [ref=e39] [cursor=pointer]:
          - /url: /
  - alert [ref=e41]
```