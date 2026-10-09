import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeSlash, Envelope, Sun, Moon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { triggerThemeWave } from '../utils/themeWave';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASoAAABlCAYAAAD6Q64iAAA0iElEQVR4nO29eXAc153n+Xkvs6pQAAr3fQPEzfsURVGURJk6LMmybKntdh+7M9Nt9/Rs7/TEbuxEbMTsRmzExuzMRGzvduxMb89MH+52e1uWT9k6rJPiTYoiRRIkSOIkbhTuo8483v6RVSBBgCSEgwTl/DgYJlVVL19mVX7z937vd4ipgYjCxcXFZR0jH/QEXFxcXO6FK1QuLi7rHleoXFxc1j2uULm4uKx7XKFycXFZ97hC5eLisu5xhcrFxWXd4wqVi4vLuscVKhcXl3WPK1QuLi7rHleoXFxc1j2uULm4uKx7XKFycXFZ97hC5eLisu5xhcrFxWXd4wqVi4vLuscVKhcXl3WPK1QuLi7rHleoXFxc1j2uULm4uKx7XKFycXFZ96wboRKhOLJ1GO/ff4ocmn7Q03FxcVlH6A96AgDMxpCf9aJ/0IrWM4mIxjGfrMeqy3/QM3NxcVkHPFihUiDCcbSzPYiPWpFnexHhOFLZiBQN/BqU5TzQKbq4uDx4HpxQKRBRA3llEPneFcT5XlQojgWo3jHUqXZI0VFPeRDZaaDd31WqaZqYlrkqY0kp0aSGpmmrMt5SUUphmiaWbQEghMCje5By+dfStm0M00Cp+9O3VgiBJjWklPPmffu5rfQYUkg0TfvC18a2bSzLwlb2ml0TKSW6pt9xbkopLMvCsq01m4MQAl3T7/tvOMmDEyrTRIzOoP/tCUTHCCpiAAIFmArsa0FU1EQAPLcZ0n04/1h7bNtmanqKyamJFY+VFIf09ABpaWlzN50Qq38ySimUUti2c9OYlsnU1BSh8CwAmtTIzcklJcU/N7fkXJYyH6UU0WiE4eAwtrJXff6LoUmNjIxM0tPT8Urv3H+3LIvJqUlmZqdXfHMKIfB5faSlpZOamoomtblrcrfropQiFo8xMzNDKDS7ZtfE6/GSm5NLamraoq9blsX0zDSzszMYprEmc9A1nczMLLIys9Zk/Hse/0EcVMVNtNYhvD88jdUzAvEYEtCUxEZgSTAEMDyNfOsSQoE8UAdFmfdlfrF4jH/4x7/nH9/4h2V9XiX+JJFSkp6WRnPTRvbufpRHdu2luqpmVeaaxDAMOrs7uNzaQsuVS7R3tjEw2E84HMa2nRtICIHH4yE/r4Cy0nJqqjawZ9cjNNY3kZ2Vfe9jmAaXrlzi3//ZvyU4MoxhrM1NkUQIQU5OLi+/8HWeOfgcVZXVc6/NzM7w1rtv8st33qR/oG/Fx5JS4vf7qSyvYv+jj7Nz+26qK6vJyLjzby4Wj3G97Rq/eOtnHDl+mNnZ2RXPYzFqqjbwz//gX/D4Y08seE0pxcTkBB98/B6/eucXdHR1rMkccnPz+PoLr/A73/q9OwrmWnLfhUrFDOSFHrQPrqAu92JH46BAQyCUQgiBQmADxCz0oVnkB9cQSqAerUZVrL3PStk2wZEhWq9dWfYYtz9bPR4PvX03uNLawolTx9i3dz/PP/MC6WnpyzanbdtmZnaGzq4OTp89ycWWC3R1dzIcHGZ8YozpmWksa/7SSAiB359KVkYm2dk5nDh9jA3VG9i2ZQd7dj5CRXnlXZcY4XCIzq4O+gf6iMVjy5r3UhFCUFhQyMjoyIJjWZbF+MQ4nV0ddHavzs2p6zpd3Z1093Tx2fmz7H1kH089fpCCgkK8Hu+C9yulCEfCDA4NcL3tGlPTU6syj9sRQjATmrnj64ZpONeiu3NFv9m7UVRYxMjYyNxD735z/4RKKZRpw+VexMdX4HQ7zMZQUiASSz4lHEtEKNCUY3KLmI1sH0XobdiA0iWUZN2fKS/xfWIJ7zSMOANDAwwOD9J6vZXOG50IITiw/0nyc/PR9S/2VZimSW9fD+cufMbRE0c4c/YU3T3dhEJ3f6onxSYcDjEwNEDrtStkZWZxoeUC/QN9PLH/KWqqN5ARyFiRL+thxDRNxsbHmJicoLOrg+7ebqampnjqwEGqK6sfiCXh4nB/hEopiBkwMI71q3PIczcQ03FAOIKUuM+TYqUpwAJIiJit4OowyrJQAsSzG1FpHoS+do6925dvd0Is+Z2JcZViZmaas+c+ZXJyAn+Kn31795OXm7fkMQzDYGCwn3fef5ufvvkGn352ZsmfvR3bthmfGOfEqWN0dLTRdaOLl57/Gls2bSMvN++BOU8fJLZtMzE5wfGTR+m+0UUsFuWlr75MbU3db5x4rxfui1Ap04KBScy//BBxfQhm4kglEDYoibMDmLjXpbKRyvkxqIT3XCoBtkJ2jkL0EgoFTzdCbvr9mP6qo5QiEgnT3tHGX/71fyIQCPDUgaeX9FnDMBgcGuDP/9//iw8+fo++/t5VmZNt2wyPDPPGz17n84vn+P3f/m/55td/a0m+qy8rSimGg0O8+fbPqSivpLiwmEAg40FP6zeSNX88KMOElj7sfziG1jaMJ2TiNQW6lbCclGNFAciEYN1cSikkCoFy/FeGQhuaQfvVJXi/FdU3vtbTvwvO5J3/seCPWOTP7URjUa61XeWDj9/j84vn73lE0zS53n6N/+PP/nc+/OR9BgcHMM3VCaEAR6wikTAdXR38+Oc/4o2f/SORaOSB+SXWA6Zp0tN7g3fff5tPzy3fcnVZGWtrUSkwW/vhkyt4zt9ATsXQbIGWECQlBAhHqGxxU7BQ4OwKqzlLCxJWV9RC9E6iHb6OUgK1T0Fl7qpOW2oa1ZU17N/3+N1P7i4403ecrRMT44yOjTITmp23la6UYmpqirPnPqW5cRPbtmy/43imadLZ3cH7h9/jo8MfMDo+ihG/866bpmnkZOeQnZVDZmYmPq+PSDTC5OQkI2MjTN/B8auUIhSa5crVy6SnBygtKePAvicIBDKQQpKVmc3unXuoqqwmbsTvPF/DYHhkmOBIcIHfLDm36soavF5v8steeA2FIDsrm8qKKtJu8w95PB7KyyrYtWM3JSWld5zHPUmEGIyNjTEUHCISCS/4jmZmZ2i5conr7dd4fN8T6Lo+F9qREcigvraB8UfGmb2Hf3C5VJVXkZtzZ9eAz+ujtLiUndt2kZOzuvdCkpzsHCrKK7+EcVSWjTU4gXHiGvqZdjzjEaSSyITJYQuBLQWWcP6eWO05rwscC8r560JJsBX69RFnDAF2io7KCyBWKShU13R27dhN5l1jRu4tVEoppqen6O3r4dKVS5w5d4ZQaHbeTpxpmXT3dNF1o5NYPIbX410Qu2PbNmPjY5z69CS/eucXDI8MO1bObRdHSklmRiYlxaWUlpRRVlpOSVEJebl5+P2phEKzDAWH6OzqoL2zjcGhAcYnxheEGSilmA3NcrHlc37y8zcoL62grrYen9dHcVEJr3ztm/PCHhYjFJrl2MmjnPr05AKh0jWdqspqXvvGtwikZ9x1IyElxU9NVTWZt4UJ+Hw+NjVvJi0tjVAodMfP3wvbtgmHQ/QP9nPh0udcbPmc8fHxeSJsGAYjo0H6+nsZHR+lML9wLgCysKCIxx59nOrKmjWLYcoIZFBeWr7oa0IIUlNTaW7aSGpq6prtPCa/B133rMn492JthMq2sUMxYu+fRzvVhn9oFq8Fmu1YTZYUxKXAlGBJObdUMqXzHt1OLANJLK4WeeAqy0ZcG0LE49jSRjy7GdJTQFt5IKWu62zbsv2uFs5SmXOen/+U0X/7v3C9/Trh8M0bywkunSYYHGZsfIyigqIFQmWYBpdbL/Hh4fcXOs6Ty+bE033Xzj1882uv8dLzX8PvT13wBEw6z89f+Iyf/OINjp08SjA4jGEa84THsiyCI0FOnj7O9q07CaQHqKqspqiwiOcPvXDP8x6fGGd6ZobWa6300jPvNalplJWW8+LzL5OXm7fo1v+9SPGl0NTQTFND8xf+7GIYhsHl1hb+/C/+jCPHDzMyOjL/ddOkb6CP9vbr5Obk4pVeNE0jLzfP2QjZuSrTWBb+FD/1tQ3U1zY8uEmsMasuVEoprOFJom+fxf/xVXzBMLrl7N45iJuWkEgs525u/GELsARokLC87nIwW0HPBNovL2ErgXqiHnGfgkKXivPES6NuQz3PHfoqU9NTdHV3znuPsm0mpycZHBygML9wwRjRaJSPjnzAmbOnFj2GpmkU5BXwu9/+b3j+0AvU19aTmpq2aFS1lJLsrGwe27ufjU2buHL1Mt//4d9w+OjHC5aDSinGxsf46ZtvUFNdQ0lJKT6vbwVXY/2i6zrVVTV8/cVv0NZxfYFQmabJ+Pg4Q8Gh32if3YNidYVKKazOYczjrXiOXMMXDKPFbUBiCYGlOX4pO3EDafO+bwE+HVWQiTUygx015qwqcadVlhIIw0YLzqI+bEUJJyhUlK/NOn25aJpGenqAhtoG0lPTFzjWBWDE4syGZhakg8TiMTq7OmjraGN0bHTB2FJKCvML+We//10OHXyWug1194z30TSN1NQ0/P5U/P5U4kYcXdN5+9e/IhaPzZtD3IjT19/LxZYL1Nc2ULehfrmXYV0jhCA9LZ3ysgpS/akLXle2TSwWJXybD8vl/rBqQqWUwuoOYh1vRT/Siq93Ct2SgJgTp2SclBOOcNPGUlJgFwRQzSXQWIJ1pgPVEUROx/DYdxEqnHFUzEJ0T6COXnfeu09A+fqqumBZFjMz09iWuahQaZrEc9sSyAljiHDh0nkGBvsXOK+llOTn5bNv736++uyLVFfV4E/k8S0FIQSZGZns3vEIY+NjdHZ30HLl0rydRKUUoXCY1mtX6L7R9aUVKqUUhmkQCs0unowuBLqu49E9a5Kn6XJ3VkeoLBt7fIbYkUt4j17F3zmB13SEyBJOOol1y67ePCtJCMysFKwd5agXt6DXF2Fle1EfSdTlQeRs/I7b+zcRCBO0a6NgOlabykqFVO99r7pwO8nE1eHgIGc+O83E5MKQCiEEaWnp5OXmLbgJQqFZzpw7TXBkeMHnfL4Umho28vWXvklVRdUXEqkkUkqyMrPYsXUnhw4+S19/LxOTE/Mc/vGEVdfb14Nt21/KoEfDNBgcHOCzzz9jcnJywetJqzg7O9sVqgfAqvzirJkI028eg8OXkD1jSNtZ1kk7GYaQCEGAWyKkHP+ToUFsWyn2wUY8TSUIXcN7sBntmY2I2nsVzhOJU3D+X1kCu20M9f5V1LkbELnz9vn9QinF2NgoZz87wydHP150+SakJDMji9Li0gWlTMKRMBdbLjA2PjbvM1JKcrJz2Ll9Fy8++9KK0js8Hg/1tQ288OxLbGreQnra/EBawzDo7euhp6+HaDTypVv6WJbF9PQ0n547ww9/9PeLBtFqietdVFCMJn/zovUfNCu2qIz+EWLHLuE7fg3fSBiPJZFKOjFSCGwh55znTnSnjZMao2H7/Jj7a/E804RsKr4ZTyMF2vbKRJyVB1oGUDHTkSShIGmaC4FCgtKQtnA+L0D1T2P/4FOIGrCzEpUX+ELnFDfi/Pr9d/jk+Ce3vaIWN+0S9+3tLzlxUpMER4bp7ethZCS4IElY13UqyiqorKgiJcU/97RWSjE7O0P3jS6mpqcWBHbqmk5JcQnlpeWr8oSXUpKZmcm2Ldvp6GpfsM1tJdJKhoJDVFVUP3CrIhSa5fTZU5w5e5rR8YXiv1SSQa7BkSBd3Z0MDPYvmmzt8XgoLCiaF0tkGAZ9/b2cPnuKy62XiESjy57H3SgqKOL5Z15gY9OmRV+fnZ3h4uWLnP70JP2D/Wsyh0B6gN079/Dk/qcevuoJdjQGPaOoE614h2fxRAW6pYO6GR9lSokF2MJGYiKVBUpgZ6Zgba9GPtOMbCjAEJLx9ml6LoxT/2gBGfkpiM1lgMRSwNVBCMXxCBuhDAQKpSQKDRsQQkssJxXKjKM6x7COXMfKTUNlpX6hvEDLNLly9TJvvfvmSi6PE0wYixIOh4nGFv8Ra5pObW09tRvq5oUSKKWIxmKOSBmJQnVq/ucqSiuprlydcjFCCDICmTQ1NC+wqMC5oWdnZxgbG6OyvGpVjrkSYvE4HZ3tHD76ETd6byx/oKRvKhyeFzZyK/4UP3Ub6qmvbSDjlhQay3YqOFxs+ZyPPvlwzWKY6jbUs3P7rkWFSilFJBqlo6udT44d5lrb1TWZQ35ePlmZ2RzYt7DUzP1gRUIlAKFJfIF0dG0aHdBsx6KyAVuCjebk7CnTSY2Rjv/Iai6H5zaibSrC1HSC18O0fjzB1aNBVEhSuz+H7IpU2F2BiJrYQiCuDqBmw2jKShSCEdgoJ3XZthFKcwTMIzF9Erw6yEVDRu+KUorpmSkG1ujplMTj8VBVVcOeXY/SUNe4YA6GEWd6esqpYnnbKWiaRkF+IQWLhDMsByEEqX4/pcWlpKSkLHjdtm1CoRATk+PrYumXLHEzHBxe0+9JSkleXj6P7H6ULZu24PHcDHhUShE34kxMTjAw2L9mQpWVmUUkGrnj64ZpMD09zXBwaM2uhW1bcwUYHwQrE6oUH/rGStB19ImPkJ1TaIbt7OgpAOks3YRACYkQYAW8qK01qGc2IfdWYZuK8Rshrn44wdnXp4lMevhsPIiIKppf1knL96EONSCk5uwsXuhCJtNwsJFYKCWRKhFNqoFK82A15mG+uhM2FCC+YAmV+0VKip+9e/bx+L4D84rCJYnGokxMTiwat+MUwdOdFJRVQkiJLyVlcWd5wl82M7swhOLLipSS9PQAG5s28cT+J6n7EgdUrndWfAcrvw/RUIr9vWfhb44gLgwhIgphaUh0dOlBlzqmBKX5sXbVop6rR24rxrZsZkdinPq7bq68N0VswoewFVMDcS79eBAjFGPPH1ajp+rIx6vBI5y60Oe60LHQlYHESgSTWiAkKtWDvaUE43t7oTgbfA8m5N/l4UZKSWpqGju27uSP/tkfs33rzmVF0LusDisWKiEF+H3YNfnEv7kHUlrwHrsBMQlojn9bE9jZ6Rh7y+DZakRDLiYw1Rfh+F/d4PrhSSKjCiFsJ5XGlIwNWFz+YJKo2cWe36sgLdeLtrEYezaKPRxCBCcQcTtRbQGQYGbomPuqMb/aDKU5oGv3rc76cohEwpw4dYwtG7dQXFRCYcH8ZZyu6aSk+Be1cJRSxOMG8fjq7WzalkU0codqCUKQ6k8lI5DxwB3pa43H46G0pIz9ex/n6y99gy2bthFID3zpz3s9szprIikg3Y+1pRwzYiEjAv3wgONUlyZmQSrGzhLU87XI5hziHo3xjhgX3x7n6uFpQoMKbIlMhKorBNG4JNhtEnl3gpR0Lw3P5JNT5kfsrEDNxDHfv4zotSEWR2oS0jwYj1VhPl2P3VSE8K7Nck/TNDy6B92ztG4uhmFgGPFFy7EkS4icOH2cmuoN84QqWTK4sKAQTSzcCLBtm+mZKSanJld0PkmceK84wdHgouInpSQtLY2szC9PHJGmaU4+pJTouk5aWjpFiZ29jU2b2LNrL9s2byM1NW1ZsWNSSny+lHl+reWQlpaGZ5nJwMnGFV7fylKfAukZD9SiXNW7WWT4MXdUgikR3VFEfwg7A+Jb81EvVCN35WPaMNEZ48oHk5z98TjGlAchHJESCd+HnQg7MOMw1mtz9v8bRk/R8RzKI6M4AC9uQkWjGMcEZv8k0icQm0own2vGbi5B+Nfmggoh8Hp9lJeWU1tTR2rqwlSLW3GsnhijY6P09PUwNDy4IDwhbsS5cOlztm7ezuP7npjb+XNSOtIoKS6d8xvNSxo2TXr7e+npvcG+Rx5b8bklk6evt19jZnZhfe6kvyY3N/dLI1QpKX6aG5opLCwiM5BJTk4OtTV1NDVupLamjpzslWU3+P2pNNQ1UFFeia4t/1YrKylb9qaJR/dQVlpOfW0Dfr9/2d9dZmYWG6prv0RlXnJTMXeXY8VtfH97lXhTDtZLtchHS1G2YmYwxoVfjnHuJ2NEJiyn2ehtQzj7dE4clmULRvotLvxkDK9XZ+u3CpEBL+q13VgeH/axDmS2F/GHjyFKc9bMkoJEfaTMLA7sf5I/+d6/XNQBfjumadJ67Qpv/Owf+dsf/DUzszMLqhT0DfTR03uDSCRMWlr6XJumlBQ/+Xn5BNID6JpO3L5p6cSNOJevXOLzi+d59eu/haZpKxIQy3aqJZw4fXxRK01P1JBarLrDekRKp0+fZVl3TCLOyszi5Re/wQvPvkhV5erHhuXm5PLtV7/Dt775nQfWZio1NZVH9+zjj7/7J2yoqX1ok8rX5q7OSkEdqCaWnwUFfmRxKrapCI3GOPafO7lxZBxt0iTNAlPo2CJRx3MuxcZGYiOFs7tn2DaDnSFa3hsnJcND44s5iFQP8plGxM4ykCCLsx2f1DpD0zRqa2p57ZVvEwqHefvXv1qwhZwsTTw+Mb6g6oHP66OspJzevh7ik/F5nwmHw1y93spHn3zA4/sO4F8kmXYpGIZBV3cnh49+xJXWFmZvs6i8Hi/lZRVUlFXMC0pdjyQFvrqymq2bt3Hp8iVarlxc9L1jY6O8+dbPyMnOITMza8UWlMvasTZJW7qELB9qSx6qMgND9zDaEebYX3bQe2KEaDCENKLoykBTSavq5pa3QCVqp1tIYaFJhRGz6W8NcfGX41x/Z4LItIXIS0PU5iGrc53dPbn+bqDkjVNcVMKmpk0LCsDBLWVehgfnPf2FEAQCGTzx+JOUFJct+JxhGlxvv8av3nmTweHBu1bcvBPJZqvnL5zjw8PvMz0zvcAC8fp8NDU0U1O94aHI85NSkpOTy8EnvsJzh55fEKOWJBaPcb39Gm+9+yaHj37E7G9Q6MXDxlqukyDdgxG1GWsLc+29UVrfGsKYjSFMkEjUnAm1yI9D3OzuIqVTeio6bdB7cRLMKDYGZbuyCBQ8HKZs0nF7x555tr3A4e4kK6fx6J7H+OToYdrar80TI8uyGBkJcuzkURrqmzh08BmqKquX7PS0bZvJqUlOnjnBex++S0try4I5aJpGVmYWG5s2r1oU/P3A6/FSW1NHeVkFkUiYSDTC4NDAvGqmTmCvk+Pn9fpIS03jsb3755bfLuuHNY2ENA2biRsRrr0/yec/HCE2ZQAmOFFQgAcbga2cSp7JXD8115YmIVQCPCiUihOeiNN5ehbbiqNsRc2BPFIy1mdAZ5JkPtng0ADRRfLBklZXVmbWghvE6/FSVVlNQ30jl65cpLdvfrXMuBGnp+8Gf/P3/xWApw4cpKyk7K4dfm3bJhaPMTk1ycVLn/P6j/+Bw8cOMzMzvWBeXq+PDdW1bGzaSGFh0XIvwQMhJSWFpsZmpJSEIxHefe8tp9b8LWJlWRYjoyMcPvoRpmWSn1dAY32j28NvnbFmd7hSEJowOPfGCJd/OUZkIu7okEhUPBA6oGELp/Z3sj+yPS/j5aZYiUQ3GgDThO7PpjGUwDAUW18pXqvTWDHJNIuevh5+9sufMDA0sOj7PB4Pfv/iZVr8fj/PP/MCw8EhfvijHyx4PdnO/c//4v/kzGenePXr3+Kl5792x/kkO838+oN3+OmbP6aru/OOuYjZWdk8d+ir1G2ofygdsf4UP9u37iDFl0IkEubjIx8yHJxfMidpWZ46c4K/DvwX/vi7f0Jz48YHNGOXxVgToTINm5lgjGN/1UP7JzOEpwxsoZB4QGkIkejbl6xDfMu+3/x2WXfGMm2Gr0xzSVdYymTz8yV4/GvrTE/WlhocHODE6eN0dLXf5d1irvBde2cbh49+TGd3J/HbMvOTVQvKSsspLipZdGno0T3U1tSxd88+Lre2cOnyxQV+JMuyGBsf49iJI3R0tvP6T37IhqoNlJWWk59XQGpqKuFwmP7Bfq61XeV621X6B/vn2qXf7ptJhiM0NTTz2N79D501dSse3UN1ZTXffPk1JqcmOXH6+KJllycmJzh55gTlZRUIIVZcjz0ajdDW0cbRE0dIvcNDaCmkpaWzobqW/Lx7lT1aiJEIYzl28gg3eruXHQvl8/ooKiqmsrxqxXFhy2HVhSoesxjvCvP5m4Nc+2SM2UELZQqEUFjoie4yItlPCrjZ3AFYciC5UhCbtRi6PINSNl5NUrUvn/T8tQ1KC4VCtLReYiY0s2jJ2ps4ghOPxxkODtPd00U4vNBZ69E9bGzazKamzXcsfOdUNshg94499A/00dffy+TU5IKYLMMwGB0bZWJygo6uDi7lXyQnO4dAegY+n49YLMbE5DjBEaeRxO3dZ249Xnp6gG1btvPq13+LqspqUnwLE5UfFpLns3Xzdr767IvEYjFOfXqSSCQ89x4nCdygf6CP9z/+NSkpfjwe5wGxXGZmZzlx6hhd3Z137bRzL8rLKvjtV39nWUIVj8e43naVWCxKenpg2XFQ2VnZHHziK5QWlz78QmXELMbao1x5f4xzPwkSmbZQpvNDEYiENXXTYlqpu1IpiE5aDJ6fRbeG8KZ4KNuTRWr22oiVU3olyo2ebm70dN/yymJncqezu8V6FIJAIMAju/ayZfPWux472Xzg0FPP0tZ+nVNnThAcDS4a8W5ZFuFwiO4bXXTf6Lrnec2bXeKm3ty8mZee/xrPP/PComVfHjaklOTl5nHwwNPEYzHC4RAXWy4Qi8fmWaeRaISWKy14dA+pfj8ZgUxysnOWJTSRSJjLrS1cbm1Z0dybGzdy8ImlddK+HcMwGBgauKPLYakUFToR+7c/HO8Xq1gzHaaH47S8Ncb5N8aIjKu5yp5qbldPknRTCW62xFrZgQVWCAZOhUjLCqJ5BZX7ctF992sb/d6Fkue/9yZej4+qymp2bNtJTdWGu39SCFJ8KWzetIX/8V/+T/yH//vfcfL08btaRl+UZMpH3YY6XnvlW7zytVcfWKDiWqBpGiXFpbz41Zfxer1MTE7Q29dDNBadZ+lGImHOXziH1DTy8wo4sP9JsrO+PKlDDyOrcjcrWxEPmZx/PcjVd8aIjcedUsS3CJESCks6zvJkk4fk35d9XJwxbMC2BN1Hprj0oyG6ji6/4uP9IhlE+ad//D+wc/vuJX0mmbe1oaaOf/2v/me++0/++ar1tUtaUo/u2cef/NGf8twzL8wrEvdlQdM0chMxVv/iu3/ipLcsYi3F4jEutlzgB6//Ha3Xrixooupyf1mxRWWZTqmWMz/qpeNwkPBgDGGBlCKRBiMT+3mOWNnCAgTyli40kBCsef6bm7t9yX8rbjrfb1pqTihDXBhYs4K+c1OJ/2ZTsScXX2B9lXlJBnFu37KD3/3277F75yNfSBCSYlVdVcPLL75CSXEp73/0a06eOcHo6MgXDvpM9h3c2LiRrzz1DI/t3U99XSPZWdkPRXDncvDoHgoLi9i3dz9d3Z386t1f0t7ZNu89TqFAp1v06z/+IUopdm7buezof5eVsbJSxKZitCfCtcPDXH5nkEhfCBW3kUJDoTsVN5VACJkQHCvRLit5AyTSZhLt29VcOIJK/Leb4QnJ7D8luCl8if+uBChpYyvB7JhB76dT2MoGISnZmkVa7oOvI6RpGulp6VSUV7J542ae2P8Uz33lOdLS0r+wgzO5DKyp2kBGIJPiomI2NW+m9doVbvR00z/YTzA4jGmZi+a56bpOamoauTm51NbUUVtTx9bN29i9cw/VlTUPLPH0fiGEcCza0nIOPf0c07MzTgjJbSWNkzuph4997FQw8HjYsXUnuq67y8D7zLKFyrYU4/0hrn88yunX+5kdiKLFQBdirm+fFAmrSgFCOQaTUkgUMqE/Tr1zlcjtUwhNoSzrps9AwU0/kATlVAt1hlKOVSUSbd9tJ4l5dtym4/AE+BwhLN+ZjT9j6ZaVkJKC/KIlLqvu7aPSNJ201FRKSkrZtX03j+19jKbG5hXvpEkpKcgvoCD/IPv27ud621UuXLrApcsXab12hXA4RDgSwUo0w3CqgnoIpAfIzc2jpmoDj+87wJZN25a1o3Q3NE0jJyeH6qrqueMnSUlJoaykDK/HixTLs9o0TSM3N89JtL2lhIkTPJuSaJZx9+vr96eyfct2TNNASsnxk0fvcCydzu5OrrdfY2PjRnQ9fe5Yqf5UiotKaKhrXLTqxGpQXVlDIO3ODUo8uofsrGxqqmrWLAUoLy+fgryCB2Zli6mByLLOLDpjcur73Zz76SBjgwbKFnhthW6DtBPLPSEdP5RQtzjUHZK2ktOj1EJi4dUUvlQwIia2YTtdZxSgdFA6Ct1JVxYSW4KFjUrYVpoQSJVo0WUnlo0+Re1TWex4tZT6JwtZ6kPQsix6ensSHT1W9sULIQikByjILyQ/L/++WSvJmuLJPn3g3Nz5efkU5hcSWGP/k2EYBEeGCY4ECd3WNEHTNPJy81bUzNQwDIaDQwwHhxfUE/d4nBu3vKxiSb0ODcNgaHjwrk0iNE0jI5BBUWExOdk5CCHmGl4MBYcYnxhfdAd2NUhLTaOyouqOSdORaITh4SHGxsfuWlt9Jfi8PkpLSikpLl2T8e/FFxYq21LEwhan/qKL9o9HCfZEiFgSW4HXEuh2sl66mBOp+Te7AmyUsLGkwpACSzcoqk+h+clc6nYVcfIHHfSem8CYVGiWs4RUSkcJiY3ElBIlbOw5v5VCIxG9rpira4VQ+LM9VOzIZNsrxdQ9mYvuvfcTIRlNbqxS9UxN09B1z31fMpimiWHE57aUhRBoiW6/ay2Yyc7DpmEsWH4m57ESi3Ip43s93iVZAMmx4rGFbbJuHVNKOe97VEph2zaGaWCZ5ppZM1JKvF7fHUMkknOY61a0Bggh8Hi9D6x43hda+tmmzeRAlAu/GKbtowmmeuJYcRCanahbLhLubudmvGlE3fy3U27YAAwENpaU5Df52fh0PlsOlZJbEiAWi6P7vXQfnSE+pqHZmiNHzsoPoRw7iluOZSdFCnVTqBSExg16P58GFEq3qdyeTdo94qySDuuHMWXkVnRdX1Gg4UpI+oHW6oe9muMvdywhBJqmOaL/AH8qUsovxe/1bnyhX/HkUIRrR4KcfyNIbMjANnGCopTtNAa9PR0GEspy899CgSYsIIbSLQpqM2n+SiEbny6leEM2ALV7C1GmF8sIcuNIBHtaopSFrew5C0okR0wc92bfu6SVlUDB7GiMjtMmpg5KSCq3ZpOes74TmV1cXG6y5Ls1OmPQcXaU828OMDUg8NhOpDkCpLoZOHA7c5kyt6JA8wq8hZJNL+az6ZlSCquy5172+j3UH8jD49eITfUzfN7ADDEnRABS3Rq4YCd8WYtHkCoF0WmL6x9NgKaDkNTtycSburpiZVnWnAmuaRoej3fFlTeTKKUwTRPTNLAsa25ps1pLONu2MS1zXuSxlBJd05FSLvscbNvGsixMa2H5mJVaQ7ZtY9v23LIMnBpdSqk56+L296z0u0heJ2Du2qwGyXmalrOEFEKgSW3V0lWSv81bl4ZSSrwe70Oxg7nkO/XC+wN8/rMRhi9JhK1jJ5uAKhC2nB8TJVi0xJSDAOEhvdRPw2vZ7Hy5nrTchb4K3Suo2pGJ/195eOt/u85Im4EdcXIDRSK8QWKDsh1nffL/7+D8FoCKKdoOT2HHwbZsNj+9ejtdTsXNEO2d7fT03iAjI4Omho3k5uSuyo/Ntm2CI8O0dVxncnKS/PwCamvqFnSuWe7Ys7MzBEeDjE+Mz93Yaamp5OcVkpuTu6wl5K3t0odHblYs0KSzI7ihunbZc7Ysi+mZaUKhWbxeHznZOVi2RV9/L5FImObGTYkGGNNEImF8vhSys7JXJOzJ6zQwNICu6+Tl5q9K5H4y2X18fIzBoUFMy0TXdAryC6gor1yV8adnpunq7pwXZ5cRyKC6svqhiA1b0q/v+N8Oc/WjWUZagJhnTiic0AOBwAKhFrWobsfWLHKbUmh8Lo8tL5aRmuND0xc+lYQQeP06+Rv8PP69Ms683kffuTDWjEAoecsi09n5U8r5WzIaYjGEAjtk0P/ZFB4p8Pt0Kndk4ElduVUSi8d469e/4tiJI/QP9uP1einIK+Dbr/0Oj+3dv+KxT585ybsfvM2FlgtkpGcQjoTZtmU7zx36Ko/u2bfi8c9d+Iwf/+xHDAwN4PF48Hq91FTWcOjp5wik71iWUJmWSXdPFx8f+Zgjxw8Tj8dRSpGelsaObbv49qvfIT+/YFmWVTQa4fyFz/js/FkCgQCvvPQqI6PDvPPe24yMjvBPf/8PyMzM4tiJI3R2ddDctImnn3h6RXWmTMvk8tXL/PXf/Rc8Hg8vv/AKTz3x9Iotw0gkzLkL53jnvV/R3tmOUgopJIWFRTy5/ymeeuLpZQuiaZqMjI3wydGP+fkvf4ppmfi8XlJS/GzZtI3XvvGtLyRU08E4GQX336G+pF9ffDpOdNjCnFJIpc0JlZO0pxLb/k6HZIC54ue3IyCn3kftM7k0HComu+zOsSHJ93tTNWoezSEeNdA9Y9w4Ecae1Zz0HGEihInCwkImji/uKFYChaYUKmxhzhhInVVINnQw4nHOnv+Uzu4Oaqo20FDfRDQaWdL2+N2wLIvBwQE+PvoRfQN97Ni6g5LiUvoH+ugf6OPo8U+orqxZUeiDsm1Gx0a50XeDQFqAjc2byM3JpSC/0GnXtUyHvBSSzIws6jbUMTo2wtnzn+LzOvmNjQ1NTs/CZcZRgWMp9Pb3MjE5zr5H9nO5tYXTZ08xOTXBrpbd1NbUcbm1haHhQXbv3LOiJY5pmgwPD3Hp8gVarlwiPS2da23XaKhrXFKTj3uNPTY2yo3eGyilqK+txzBMOrra+eDj99i1Y/eyhcpWNtFIhKHhQaamJ9myaRuVFVV4PR4qyivvUQFkER5MTvLShKpyezqTnbPEJmPMBi2cFEGZUAOZsKYS+30qmeJyUyoUCqlDWp5G7cFsGp8uoqg+a0kTlJokJeCh4clCQMMIjzD4mYmKKlAWYCIwEXiQSpuLWp8vVmquaqjuk+TX+Kjek0FhfRqaZ/UC2EzTRNN1CguL2LZ5GwBFRcsv6pdst9Xd08X1tqtUVlTx333vT8nLzaOvv5f/+v2/5Mq1y7S1XyMzMxO/tnxRTO585eXlU1tTR0lRCQUFhdRULb9Ouq7rc3W2qqtqMIw4mRlZPHngIHt2PrLsuQJ4vb5Era18rl67QveNLi63XmJyagLLsjjz2WmklIyPj5ERyKS5cROeFVg+sViUzu4OOjo7KCstJy0tjdGxIO2dbSsWKnCuvz/FT2lxGfv27mdmZob+wT4GhgaWVQv/dqTUCAQyqKyoormxmUB6BsXFJfds+XY73rR13C6r5vFsZKqJ8hlceXMaOyoQtpxzRCklIVHGxekmY2ML66ZQaAp/AVQc8rP9m2XkV3+xYEMhBP4MD40H80kJeHhvtIepHhOiicYQygkydbxWyQUhKGQi2NTGFjbSI0gt89D0ciE7Xim+Z5jCF8Hj9fLonn309ffyV9//z7zxs9d5/tALfOubv01xYfGyn+ZOYOMwusdDUWEJ+Xn5SCnJysomOyuH7p5uOm90sm3LdliB9Zb0gZ04fZwf//xHZGdl89LzL/Nv/vX/it+fuu4crh6Ph5KiEmpr6jj16UnOXfiMto42igqL8af4OXbiCLqmY5gGdWUNFK2w8F8sHqe7p5uJyXGeOvA009NTDA4P0tXdiWVZK3bUK6UIhUIMBYeYnpliYmKCweEBdmzbtSphB/F4jAuXznPk+Cek+v1sbN7Md177XQ4dfJa83Lwlj5OSsY6FCqB0YzbqVYHu1bj0g0nnS1EShYal/NhIBE4gpiUMDE1hSwspBJllPuoOpvHU729YdjMGIQS+VJ2K7Zl89d9U8eF/vMHg5RBmSKBbOl7bCQy1BZgJ3bSlhi0UpoyjUhSBIp1H/mk5Tfvz8QdWd8dP13S2bt5G3YZ6QqFZjp48woeH36e+tp7amtq71jC/67i6TnZWNtFolOHgIJNTk2QEMhgfH2Nqegqf10dFWQX6Ch32TjpOIds2b2fTxs2UFJVSlXC0rtfkZN3joby0nIqyCt7/6D28Xg8vPPsS+Xn5HDt5lDOfnWLntt1sat60ouOYpsnY+CjX267yzvtvc/joR9i2jdfrw7YsOrraqayoWpGgKKUwLZOpqUnH+T09xYbqWr7z2u+uShsvny+FHVt38eSBp2iqbyY9PUBxcQkZGQ9HhYwl362eFJ3ixkywIDYdp/fYDLExzUlvQUOJxLJLgCUVtjSwPTEyK/w0PpnBrpdKySzyI7XlP3Wk5lhWpZsD7P2dIs790uDG6XHMKYEuSOQP3uKrUqCw8KQIsjeksue3Sqnfl0tGoQ+5iAN/uZimSXBkmJ/98ieMjY+Rl5PHcHAYwzDmGmEuByEEPl8K9bUNbN64hY7Odv7s//kP5OcV0tndwejYCJuaNtPcuGnFDl2nzEs6mzdt4bG9jycsk5R1K1LgPBzy8wuoqqjm5JkTFOTXUFFeSVFBEQ11jYyMjlCYWL6uhNnQLJevtDAbCvGVJw+xZdNW4vE4XTc6iUQjiWMXrkionM7Y6Wxu3kJT40baO9sYGOznYsvnVFfVrLjZhFKKyakJLrVcZGR0BCklVRXVPPP0c1/IonpQfCGzIiXgoXhjJtu+5eTiDZ4xiQRBE85Cy5RgSQMlYnj0KGnlgqaDmWw9VEhZ4/IsituRmsCf7qFuXw6mEUdZit5TIYyQhWY5y087cVpSxEhJtclrSKH52UK2Pl1MerYPTV/dZYwQAhLR7KHQLPFYDI/Xy5OPP0VDfRPeFfyANU2juLiEg098hRRfCm0d15mYmMCyLbZu2sZjjz6+4hAFISV5OXlsbNxEY10TpSVlq1owL1nramOi3HJ2Vva9P7QENE2jIL+Q7Vt3cKO3e64SRFZWFs88/RxtHddpamymIL9gRcexbTvh5G6gprqGHVt3YRhxWq5c4ur1VtQdOjEvFY/HQ0lxKY/s3kt2Vg6bN26hboOzpA2Fw3fs9LwUpJD4/amUlZZRVVmNrZyNEy3R+Xqt8hNXm2UlJStbceWDYVremKD/VJjYtIEpIa7bmNJA88bJzI5R/3w+u75eQ2nT6mbmQ6KbyoxB2/FRjn6/h9HWGVREA8OHsH2AQvhmyKv3sPVrRWx/tYLULC9ijZqU2rbN+MQ47Z1t9Pb14PV42bxpC8WFxasSp2JZFv0DfVy5epnR8dG5m3I1noamaTIcHGJoeIjSkjKys7NXNR0jmTs5OTkJQCA9fdXaUSWbMlxru0p+Xj5FBUVomsZwcJjhkWHKS8tXnEgbiYTp6evBtm2Ki0rIzMica9w6HBzCNE3qauuXnbuYrH01lWg4kZOdM7ejOTk1yebmzaQtsxx0MkZreHiI9s42YvGYk7eneyjIL6S2pvahaA227OoJtqW4djTIhdcH6fj1ODYacQ1MPUagyKTpqQAH/3A7mUXpqxYCcDtKKaKzJn2Xx3n3311hvN3CDPvBTkEIm9S8CPv/qIJtLxeTlrP2EbhKqbk/wKpEQt9pfCHE3J/VHHs1x1zsGMCajJ8MUk2Ovdrnc2tE963jreY53T7Wao99e8LyWn7Xq82yPcpSE1Rtz0EqBbpB54dhMCCQr7NhXzZP/JMG0vL8ayZSkAwK1ShpzOYr/30jn/7NID3nYsRjCl+Oh71/UEzdgUz8GZ778oWs9Re/luPfjx/tWo5/uy9ttc/nTmOt5TFWe+yHRZQWY0VbX/5MD6Vbspztf2uQka4YhZuz2P5CITnl92c3QdMl/oBO1c48jGmFnhlkbChK44FCGp/KJqciFc3z8H5BLi4uq1AzPT03herdeZi2TfBqlKKGANW77u8ughMUKtjwRC4yw2JyOMLGJ3MJ5KWgr7Lj3MXF5f6zbB/VYsQjJkITeLxf7prbLi4u95dVjXr0+t0aTy4uLqvP+o3mc3FxcUngCpWLi8u6xxUqFxeXdY8rVC4uLuseV6hcXFzWPa5Qubi4rHtcoXJxcVn3uELl4uKy7nGFysXFZd3jCpWLi8u6xxUqFxeXdY8rVC4uLuseV6hcXFzWPa5Qubi4rHtcoXJxcVn3uELl4uKy7nGFysXFZd3jCpWLi8u65/8HUbM8nmkJONgAAAAASUVORK5CYII=";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const themeBtnRef = useRef(null);

  const handleThemeToggle = () => {
    const goingDark = theme !== 'dark';
    triggerThemeWave(themeBtnRef.current, goingDark, setTheme);
  };

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'zoho_denied') {
      toast.error('Zoho sign-in was cancelled.');
    } else if (error === 'zoho_failed') {
      toast.error('Zoho sign-in failed. Please try again or use your email and password.');
    } else if (error === 'zoho_access_denied') {
      toast.error('Your access request was declined. Contact an Admin for help.');
    }
  }, [searchParams]);

  const handleZohoLogin = () => {
    window.location.href = `${API}/auth/zoho/login`;
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    toast.info('Password resets are handled by your Admin - reach out to them directly.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Welcome back!');
        setTimeout(() => navigate('/dashboard'), 300);
      } else {
        toast.error(result.error || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        .botree-login-shell, .botree-login-shell *, .botree-login-shell *::before, .botree-login-shell *::after {
          box-sizing: border-box;
        }
        html:has(.botree-login-shell), body:has(.botree-login-shell) {
          margin: 0; width: 100%; height: 100%; overflow: hidden;
        }

        .botree-login-shell {
          --ink:#15121a; --muted:#746d7d; --line:#e8e2ec;
          --purple:#6b18cf; --purple2:#8b35e4; --pink:#ff197b;
          font-family: "Poppins", sans-serif;
          background: #fff;
          color: var(--ink);
          height: 100dvh;
          min-height: 620px;
          display: grid;
          grid-template-columns: minmax(0,1.08fr) minmax(440px,.92fr);
        }

        .lg-brand {
          position: relative; overflow: hidden;
          padding: clamp(34px,4vw,68px);
          display: flex; flex-direction: column; justify-content: space-between;
          background:
            radial-gradient(circle at 18% 18%, rgba(255,25,123,.17), transparent 24%),
            radial-gradient(circle at 82% 75%, rgba(107,24,207,.28), transparent 31%),
            linear-gradient(145deg,#120017 0%,#1d0025 52%,#100014 100%);
          color: #fff;
        }
        .lg-brand:before {
          content:""; position:absolute; width:420px; height:420px;
          border:1px solid rgba(255,255,255,.055); border-radius:50%;
          right:-145px; top:-150px;
        }
        .lg-brand:after {
          content:""; position:absolute; inset:auto -8% -45% 34%; height:72%;
          background:linear-gradient(120deg,transparent,rgba(255,255,255,.035),transparent);
          transform:rotate(-10deg); animation: lg-sheen 8s ease-in-out infinite;
        }
        .lg-top { position:relative; z-index:2; }
        .lg-logo-wrap {
          display:inline-flex; background:#f4e9f8; border-radius:10px; padding:8px 12px;
          box-shadow:0 12px 35px rgba(0,0,0,.16);
        }
        .lg-logo { display:block; width:clamp(205px,17vw,270px); height:auto; }
        .lg-copy { position:relative; z-index:2; max-width:720px; margin:auto 0; }
        .lg-eyebrow {
          display:flex; align-items:center; gap:12px; font-size:12px; font-weight:600;
          letter-spacing:.18em; text-transform:uppercase; color:#c8b9cf; margin-bottom:20px;
        }
        .lg-eyebrow i { width:30px; height:2px; background:linear-gradient(90deg,var(--pink),var(--purple2)); border-radius:2px; }
        .botree-login-shell h1 {
          font-size:clamp(42px,4.1vw,72px); line-height:1.04; letter-spacing:-.045em; margin:0 0 18px; max-width:760px;
        }
        .botree-login-shell h1 span {
          background:linear-gradient(90deg,#ff4a9a,#b56cff); -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .lg-sub { font-size:clamp(15px,1.15vw,18px); line-height:1.75; color:#c6baca; max-width:610px; margin:0; }
        .lg-flow { display:flex; align-items:center; gap:0; margin-top:34px; max-width:650px; }
        .lg-step { display:flex; align-items:center; gap:9px; color:#d8cfdd; font-size:12px; font-weight:500; white-space:nowrap; }
        .lg-dot { width:8px; height:8px; border-radius:50%; background:#fff; box-shadow:0 0 0 5px rgba(255,255,255,.08); }
        .lg-step.active .lg-dot { background:var(--pink); box-shadow:0 0 0 5px rgba(255,25,123,.12),0 0 18px rgba(255,25,123,.8); }
        .lg-line { height:1px; flex:1; min-width:25px; margin:0 14px; background:rgba(255,255,255,.18); position:relative; overflow:hidden; }
        .lg-line:after {
          content:""; position:absolute; inset:0 auto 0 -40%; width:40%;
          background:linear-gradient(90deg,transparent,#d78cff,transparent);
          animation: lg-travel 3.2s linear infinite;
        }
        .lg-foot { position:relative; z-index:2; font-size:11px; color:#8f8097; letter-spacing:.04em; }

        .lg-auth { display:flex; align-items:center; justify-content:center; padding:clamp(18px,2.8vw,46px); background:#fff; position:relative; }
        .lg-card { width:min(100%,480px); }
        .lg-product { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
        .lg-mark {
          width:42px; height:42px; border-radius:12px;
          background:linear-gradient(145deg,var(--pink),var(--purple));
          display:grid; place-items:center; color:white; font-weight:700;
          box-shadow:0 9px 24px rgba(107,24,207,.18);
        }
        .lg-product b { display:block; font-size:20px; letter-spacing:-.02em; }
        .lg-product small { display:block; color:#91899b; font-size:11px; letter-spacing:.13em; text-transform:uppercase; font-weight:600; margin-top:1px; }
        .lg-welcome { font-size:12px; color:var(--purple); font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin-bottom:8px; }
        .botree-login-shell h2 { font-size:clamp(30px,2.5vw,42px); letter-spacing:-.04em; line-height:1.1; margin:0 0 8px; }
        .lg-desc { color:#8a8292; font-size:14px; margin:0 0 18px; }
        .lg-field { margin-bottom:12px; }
        .botree-login-shell label {
          display:block; font-size:11px; letter-spacing:.12em; font-weight:700; color:#50485a;
          margin-bottom:8px; text-transform:uppercase;
        }
        .lg-input-wrap { position:relative; }
        .botree-login-shell input {
          width:100%; height:48px; border:1px solid var(--line); border-radius:13px;
          padding:0 48px 0 16px; font:500 14px "Poppins"; outline:none; transition:.2s; background:#fff;
        }
        .botree-login-shell input:focus { border-color:#8d4bd4; box-shadow:0 0 0 4px rgba(107,24,207,.08); }
        .lg-icon {
          position:absolute; right:16px; top:50%; transform:translateY(-50%);
          color:#aaa1b3; font-size:16px; background:none; border:0; cursor:pointer;
          display:flex; align-items:center;
        }
        .lg-meta { display:flex; justify-content:space-between; align-items:center; margin:0 0 14px; font-size:12px; }
        /* Custom remember-me checkbox based on the supplied HTML component. */
        .botree-login-shell label.lg-remember {
          display:inline-flex; flex-direction:row; align-items:center; width:fit-content;
          max-width:100%; gap:12px; margin:0; padding:0; cursor:pointer;
          user-select:none; -webkit-tap-highlight-color:transparent;
          text-transform:none; letter-spacing:normal;
        }
        .botree-login-shell .lg-remember input[type="checkbox"] {
          position:absolute !important; width:1px !important; height:1px !important;
          min-width:1px !important; min-height:1px !important; max-height:1px !important;
          margin:0 !important; padding:0 !important; opacity:0 !important;
          overflow:hidden; pointer-events:none; appearance:none !important;
          -webkit-appearance:none !important; box-shadow:none !important;
        }
        .lg-remember-check {
          width:21px; height:21px; display:grid; place-items:center; flex:0 0 21px;
          border-radius:6px; border:1.5px solid #a9b2c3; background:#fff;
          transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,transform .2s ease;
        }
        .lg-remember-check svg {
          width:14px; height:14px; fill:none; stroke:#fff; stroke-width:2.5;
          stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:20; stroke-dashoffset:20;
          transition:stroke-dashoffset .2s ease;
        }
        .botree-login-shell .lg-remember-text {
          color:#344563; font-size:13px; font-weight:650; letter-spacing:.055em;
          line-height:21px; white-space:nowrap;
        }
        .lg-remember:hover .lg-remember-check { border-color:#465d9a; box-shadow:0 0 0 4px #465d9a12; }
        .lg-remember input:checked + .lg-remember-check {
          background:#344c91; border-color:#344c91; transform:scale(1.02);
        }
        .lg-remember input:checked + .lg-remember-check svg { stroke-dashoffset:0; }
        .lg-remember input:focus-visible + .lg-remember-check { outline:3px solid #92adf5; outline-offset:3px; }
        @media (prefers-reduced-motion:reduce) {
          .lg-remember-check,.lg-remember-check svg { transition:none; }
        }
        .botree-login-shell a { color:#6520ae; text-decoration:none; font-weight:600; cursor:pointer; }
        .lg-primary {
          width:100%; height:49px; border:0; border-radius:13px; color:white; font:600 14px "Poppins";
          cursor:pointer; background:linear-gradient(100deg,#7c31c8,#5d159f);
          box-shadow:0 12px 28px rgba(100,31,169,.20); position:relative; overflow:hidden;
          transition:transform .18s,box-shadow .18s;
        }
        .lg-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 15px 32px rgba(100,31,169,.28); }
        .lg-primary:disabled { opacity:.75; cursor:not-allowed; }
        .lg-primary:after {
          content:""; position:absolute; top:-60%; left:-35%; width:22%; height:220%;
          background:rgba(255,255,255,.18); transform:rotate(22deg); transition:.55s;
        }
        .lg-primary:hover:not(:disabled):after { left:120%; }
        .lg-or { display:flex; align-items:center; gap:13px; color:#aaa2b0; font-size:10px; font-weight:600; letter-spacing:.12em; margin:13px 0; }
        .lg-or:before, .lg-or:after { content:""; height:1px; flex:1; background:var(--line); }
        .lg-sso {
          width:100%; height:48px; border:1px solid var(--line); border-radius:13px; background:white;
          font:600 13px "Poppins"; cursor:pointer; transition:.2s;
        }
        .lg-sso:hover { border-color:#cbb8db; background:#fbf8fd; }
        .lg-secure { margin-top:13px; text-align:center; color:#a19aa7; font-size:10px; }

        .zoho-lockup { display:inline-flex; align-items:center; gap:10px; }
        .zoho-logo { display:inline-flex; align-items:center; gap:2px; font-size:0; }
        .zoho-logo span {
          width:19px; height:19px; border-radius:4px; display:grid; place-items:center;
          color:#fff; font:700 10px Arial,sans-serif; box-shadow:0 1px 2px rgba(0,0,0,.10);
        }
        .zoho-logo .z { background:#e42527; } .zoho-logo .o1 { background:#f7b500; }
        .zoho-logo .h { background:#159447; } .zoho-logo .o2 { background:#1877d2; }

        @media(max-height:760px) and (min-width:721px){
          .lg-auth{padding-top:14px;padding-bottom:14px}.lg-product{margin-bottom:14px}
          .lg-desc{margin-bottom:14px}.lg-field{margin-bottom:9px}.lg-secure{margin-top:9px}
          .botree-login-shell input{height:44px}.lg-primary{height:46px}.lg-sso{height:44px}.lg-or{margin:9px 0}
        }
        @keyframes lg-travel{to{left:120%}}
        @keyframes lg-sheen{0%,100%{transform:translateX(-8%) rotate(-10deg)}50%{transform:translateX(12%) rotate(-10deg)}}

        .botree-login-shell { transition: background-color .34s ease, color .34s ease; }
        .lg-auth, .lg-card, .lg-sso, .botree-login-shell input, .lg-product, .lg-mark,
        .botree-login-shell h2, .lg-desc, .botree-login-shell label, .lg-remember,
        .lg-secure, .lg-or:before, .lg-or:after, .lg-icon {
          transition: background-color .34s ease, color .34s ease, border-color .34s ease, box-shadow .34s ease;
        }

        /* ---------- Theme toggle: pill switch ---------- */
        .lg-theme-toggle{
          position:fixed;top:22px;right:24px;z-index:80;width:66px;height:34px;padding:3px;
          border:1px solid #e5ddea;border-radius:999px;background:rgba(255,255,255,.86);
          box-shadow:0 8px 28px rgba(35,5,48,.10);backdrop-filter:blur(14px);cursor:pointer;transition:.34s ease;
        }
        .lg-theme-track{position:relative;display:block;width:100%;height:100%}
        .lg-theme-knob{
          position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;
          background:linear-gradient(145deg,#ff4f9c,#7222c8);box-shadow:0 5px 13px rgba(111,29,190,.25);
          transition:transform .55s cubic-bezier(.22,1,.36,1),background .34s ease;
          display:flex; align-items:center; justify-content:center; color:#fff;
        }
        .lg-theme-sun,.lg-theme-moon{position:absolute;top:50%;transform:translateY(-50%);line-height:1;transition:.34s ease; display:flex;}
        .lg-theme-sun{left:8px;color:#fff}.lg-theme-moon{right:8px;color:#6b18cf;opacity:.55}
        html.dark-theme .lg-theme-toggle{background:rgba(28,20,31,.88);border-color:#3b2e41;box-shadow:0 8px 30px rgba(0,0,0,.28)}
        html.dark-theme .lg-theme-knob{transform:translateX(32px);background:linear-gradient(145deg,#3e2254,#1d1325)}
        html.dark-theme .lg-theme-sun{opacity:.45;color:#c8a9d8} html.dark-theme .lg-theme-moon{opacity:1;color:#fff}
        @media(max-width:720px){.lg-theme-toggle{top:14px;right:14px}}

        /* ---------- Dark mode: whole login page ---------- */
        html.dark-theme .lg-auth{background:#100b12}
        html.dark-theme .lg-card{color:#f7f3f9}
        html.dark-theme .botree-login-shell h2, html.dark-theme .lg-product b{color:#fff}
        html.dark-theme .lg-desc, html.dark-theme .lg-remember{color:#aaa0b0}
        html.dark-theme .botree-login-shell label{color:#c8bdce}
        html.dark-theme .botree-login-shell input{background:#18121b;border-color:#33293a;color:#fff}
        html.dark-theme .botree-login-shell .lg-remember-check { background:#18121b; border-color:#756b7c; }
        html.dark-theme .botree-login-shell .lg-remember-text { color:#c8bdce; }
        html.dark-theme .botree-login-shell .lg-remember input:checked + .lg-remember-check { background:#7750bb; border-color:#7750bb; }
        html.dark-theme .botree-login-shell input::placeholder{color:#756b7c}
        html.dark-theme .botree-login-shell input:focus{border-color:#9857d9;box-shadow:0 0 0 4px rgba(145,76,211,.12)}
        html.dark-theme .lg-sso{background:#18121b;border-color:#33293a;color:#f7f3f9}
        html.dark-theme .lg-sso:hover{background:#201724;border-color:#60466e}
        html.dark-theme .lg-or:before, html.dark-theme .lg-or:after{background:#33293a}
        html.dark-theme .lg-secure{color:#756d7b}
        html.dark-theme .lg-icon{color:#a99bc7}

        @media(max-width:900px){
          .botree-login-shell{grid-template-columns:1fr 1fr}.lg-brand{padding:34px}
          .botree-login-shell h1{font-size:44px}.lg-flow{display:none}
        }
        @media(max-width:720px){
          html:has(.botree-login-shell), body:has(.botree-login-shell){overflow:auto}
          .botree-login-shell{height:auto;min-height:100dvh;display:block}
          .lg-brand{min-height:35vh;padding:28px}.lg-copy{margin-top:50px}
          .botree-login-shell h1{font-size:38px}.lg-sub{display:none}
          .lg-auth{min-height:65vh;padding:30px}.lg-logo{width:190px}.lg-foot{display:none}
        }
        @media(prefers-reduced-motion:reduce){
          .botree-login-shell *, .botree-login-shell *:before, .botree-login-shell *:after {
            animation:none!important; transition:none!important;
          }
        }
      `}</style>

      <button
        ref={themeBtnRef}
        className="lg-theme-toggle"
        type="button"
        onClick={handleThemeToggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={theme === 'dark'}
        data-testid="login-theme-toggle-button"
      >
        <span className="lg-theme-track">
          <span className="lg-theme-sun" aria-hidden="true"><Sun size={13} weight="fill" /></span>
          <span className="lg-theme-moon" aria-hidden="true"><Moon size={13} weight="fill" /></span>
          <span className="lg-theme-knob"></span>
        </span>
      </button>

      <main className="botree-login-shell">
        <section className="lg-brand">
          <div className="lg-top">
            <div className="lg-logo-wrap">
              <img className="lg-logo" src={LOGO_SRC} alt="Botree Software" />
            </div>
          </div>
          <div className="lg-copy">
            <div className="lg-eyebrow"><i></i> Enterprise Proposal Tracker</div>
            <h1>Proposals, moving <span>forward.</span></h1>
            <p className="lg-sub">Botree Roots brings your proposal pipeline, reviews and ownership into one focused workspace.</p>
            <div className="lg-flow" aria-label="Proposal workflow">
              <div className="lg-step active"><span className="lg-dot"></span>Opportunity</div><span className="lg-line"></span>
              <div className="lg-step"><span className="lg-dot"></span>Build</div><span className="lg-line"></span>
              <div className="lg-step"><span className="lg-dot"></span>Review</div><span className="lg-line"></span>
              <div className="lg-step"><span className="lg-dot"></span>Submit</div>
            </div>
          </div>
          <div className="lg-foot">BOTREE ROOTS &middot; PROPOSAL WORKSPACE</div>
        </section>

        <section className="lg-auth">
          <div className="lg-card">
            <div className="lg-product">
              <div className="lg-mark">R</div>
              <div><b>Botree Roots</b><small>Proposal Workspace</small></div>
            </div>
            <div className="lg-welcome">Welcome back</div>
            <h2>Sign in to continue.</h2>
            <p className="lg-desc">Access your proposals and workspace.</p>

            <form onSubmit={handleSubmit}>
              <div className="lg-field">
                <label htmlFor="login-email">Email address</label>
                <div className="lg-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@botree.ai"
                    autoComplete="email"
                    required
                    data-testid="email-input"
                  />
                  <span className="lg-icon" style={{ pointerEvents: 'none' }}><Envelope size={17} /></span>
                </div>
              </div>

              <div className="lg-field">
                <label htmlFor="login-password">Password</label>
                <div className="lg-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    data-testid="password-input"
                  />
                  <button
                    className="lg-icon"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeSlash size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="lg-meta">
                <label className="lg-remember">
                  <input id="rememberMe" name="rememberMe" type="checkbox" autoComplete="off" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="lg-remember-check" aria-hidden="true">
                    <svg viewBox="0 0 16 16"><path d="m3.2 8.1 3.2 3.1 6.4-6.5" /></svg>
                  </span>
                  <span className="lg-remember-text">KEEP ME SIGNED IN</span>
                </label>
                <a onClick={handleForgotPassword}>Forgot password?</a>
              </div>

              <button className="lg-primary" type="submit" disabled={loading} data-testid="login-button">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="lg-or">OR</div>

            <button className="lg-sso" type="button" aria-label="Sign in with Zoho" onClick={handleZohoLogin} data-testid="zoho-login-button">
              <span className="zoho-lockup">
                <span className="zoho-logo" aria-hidden="true">
                  <span className="z">Z</span><span className="o1">O</span><span className="h">H</span><span className="o2">O</span>
                </span>
                <span>Sign in with Zoho</span>
              </span>
            </button>

            <div className="lg-secure">Secure access &middot; Botree Software &copy; 2026</div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Login;
