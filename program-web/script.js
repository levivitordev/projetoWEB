const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserType = "jovem";
let currentUserName = "Jovem Usuário";
let navigationHistory = ["splashScreen"];

async function navigateTo(screenId, params = {}) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const targetScreen = document.getElementById(screenId);

  if (targetScreen) {
    targetScreen.classList.add("active");

    if (navigationHistory[navigationHistory.length - 1] !== screenId) {
      navigationHistory.push(screenId);
    }

    if (screenId === "homeJovemScreen") {
      if (document.getElementById("jovemGreeting") && currentUserName) {
        document.getElementById(
          "jovemGreeting"
        ).textContent = `Olá, ${currentUserName}!`;
      }
      loadHomeData();
    } else if (screenId === "perfilScreen") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil, error } = await supabase
          .from("perfis")
          .select("nome, tipo_usuario, avatar_url")
          .eq("id", user.id)
          .single();

        if (perfil) {
          document.getElementById("perfilNome").textContent =
            perfil.nome || "Usuário";
          document.getElementById("perfilTipoUsuario").textContent =
            (perfil.tipo_usuario || "jovem").charAt(0).toUpperCase() +
            (perfil.tipo_usuario || "jovem").slice(1);

          const avatarImg = document.getElementById("perfilAvatarImg");
          if (avatarImg) {
            avatarImg.src =
              perfil.avatar_url ||
              "https://placehold.co/100x100/E2E8F0/4A5568?text=User";
          }
        } else if (error) {
          console.error("Erro ao carregar perfil:", error.message);
        }
      }

      const perfilNavJovem = document.getElementById("perfilBottomNavJovem");
      const perfilNavProfessor = document.getElementById(
        "perfilBottomNavProfessor"
      );
      if (perfilNavJovem && perfilNavProfessor) {
        if (currentUserType === "jovem") {
          perfilNavJovem.style.display = "grid";
          perfilNavProfessor.style.display = "none";
        } else {
          perfilNavJovem.style.display = "none";
          perfilNavProfessor.style.display = "grid";
        }
      }
    } else if (
      screenId === "desafiosProfessorScreen" &&
      params.action === "criar"
    ) {
      setTimeout(() => openModal("criarDesafioModal"), 100);
    } else if (screenId === "transacoesScreen") {
      loadTransactions();
    } else if (screenId === "addTransacaoScreen") {
      const dataInput = document.getElementById("transacaoData");
      if (dataInput) dataInput.valueAsDate = new Date();

      if (document.getElementById("transacaoDescricao"))
        document.getElementById("transacaoDescricao").value = "";
      if (document.getElementById("transacaoValor"))
        document.getElementById("transacaoValor").value = "";
    } else if (screenId === "metasScreen") {
      loadMetas();
    } else if (screenId === "addMetaScreen") {
      if (document.getElementById("metaNome"))
        document.getElementById("metaNome").value = "";
      if (document.getElementById("metaValorTotal"))
        document.getElementById("metaValorTotal").value = "";
      if (document.getElementById("metaValorPoupado"))
        document.getElementById("metaValorPoupado").value = "0";
      const metaDataInput = document.getElementById("metaDataLimite");
      if (metaDataInput) metaDataInput.value = "";
    }

    feather.replace();
  } else {
    console.error("Screen not found: " + screenId);
  }
}

function goBack() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop();
    const previousScreenId = navigationHistory[navigationHistory.length - 1];

    document
      .querySelectorAll(".screen")
      .forEach((screen) => screen.classList.remove("active"));
    document.getElementById(previousScreenId).classList.add("active");
    feather.replace();
  } else {
    if (
      currentUserType === "jovem" &&
      document.getElementById("homeJovemScreen").classList.contains("active")
    ) {
    } else if (
      currentUserType === "professor" &&
      document
        .getElementById("homeProfessorScreen")
        .classList.contains("active")
    ) {
    } else {
      navigateTo(
        currentUserType === "jovem" ? "homeJovemScreen" : "homeProfessorScreen"
      );
    }
  }
}

window.onload = () => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user;

    if (event === "SIGNED_IN") {
      console.log("Usuário logado:", user);

      if (!user) return;

      const { data: perfil, error: perfilError } = await supabase
        .from("perfis")
        .select("id, nome, tipo_usuario")
        .eq("id", user.id)
        .single();

      if (perfilError && perfilError.code === "PGRST116") {
        console.log(
          "Perfil não encontrado, criando um novo para o usuário de login social."
        );

        const novoNome =
          user.user_metadata?.full_name || user.email.split("@")[0];

        const { error: insertError } = await supabase.from("perfis").insert([
          {
            id: user.id,
            nome: novoNome,
            tipo_usuario: "jovem",
          },
        ]);

        if (insertError) {
          console.error(
            "Erro ao criar perfil para novo usuário:",
            insertError.message
          );
          alert("Ocorreu um erro ao configurar sua conta.");
          await supabase.auth.signOut();
          return;
        }

        currentUserName = novoNome;
        currentUserType = "jovem";
        navigateTo("homeJovemScreen");
      } else if (perfil) {
        console.log("Perfil encontrado, bem-vindo de volta!");
        currentUserName = perfil.nome;
        currentUserType = perfil.tipo_usuario;
        navigateTo(
          currentUserType === "jovem"
            ? "homeJovemScreen"
            : "homeProfessorScreen"
        );
      } else if (perfilError) {
        console.error("Erro ao buscar perfil:", perfilError.message);
        alert("Ocorreu um erro ao carregar seus dados.");
        await supabase.auth.signOut();
      }
    } else if (event === "SIGNED_OUT") {
      console.log("Usuário deslogado.");

      navigateTo("loginScreen");
    }
  });
  setupAvatarUploadListener();
  feather.replace();
  const splashProgressBar = document.getElementById("splashProgressBar");
  let progress = 0;
  const interval = setInterval(() => {
    progress += 50;
    splashProgressBar.style.width = progress + "%";
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        navigateTo("loginScreen");
      }, 500);
    }
  }, 1000);
};

async function login() {
  const email = document.getElementById("loginEmail").value;
  const senha = document.getElementById("loginPassword").value;

  const captchaToken = grecaptcha.getResponse();
  if (!captchaToken) {
    alert("Por favor, confirme que você não é um robô.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha,
  });

  if (error) {
    alert("Erro ao fazer login: " + error.message);
    return;
  }

  const user = data.user;
  const userId = user.id;

  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select("nome, tipo_usuario")
    .eq("id", userId)
    .single();

  if (perfilError || !perfil) {
    alert("Erro ao buscar perfil do usuário.");
    return;
  }

  currentUserName = perfil.nome;
  currentUserType = perfil.tipo_usuario;

  navigateTo(
    currentUserType === "jovem" ? "homeJovemScreen" : "homeProfessorScreen"
  );
}

async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });

  if (error) {
    console.error("Erro ao iniciar login com Google:", error.message);
    alert("Não foi possível iniciar o login com o Google.");
  }
}

function toggleCodigoEscola() {
  const tipoUsuario = document.getElementById("cadastroTipoUsuario").value;
  const codigoEscolaField = document.getElementById("cadastroCodigoEscola");
  if (tipoUsuario === "professor") {
    codigoEscolaField.classList.remove("hidden");
  } else {
    codigoEscolaField.classList.add("hidden");
  }
}

async function cadastrar() {
  const nome = document.getElementById("cadastroNome").value;
  const idade = document.getElementById("cadastroIdade").value;
  const email = document.getElementById("cadastroEmail").value;
  const senha = document.getElementById("cadastroSenha").value;
  const tipoUsuario = document.getElementById("cadastroTipoUsuario").value;

  if (!nome || !email || !senha || !idade || !tipoUsuario) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
  });

  if (error) {
    alert("Erro ao cadastrar: " + error.message);
  } else {
    const userId = data.user.id;

    const { error: insertError } = await supabase.from("perfis").insert([
      {
        id: userId,
        nome: nome,
        idade: parseInt(idade),
        tipo_usuario: tipoUsuario,
      },
    ]);

    if (insertError) {
      alert(
        "Usuário criado, mas houve erro ao salvar o perfil: " +
          insertError.message
      );
      return;
    }

    currentUserName = nome;
    currentUserType = tipoUsuario;
    showSuccessModal(
      "Cadastro Realizado!",
      `Bem-vindo(a), ${nome}! Sua conta foi criada.`
    );
    setTimeout(() => {
      closeModal("successMessageModal");
      navigateTo(
        tipoUsuario === "jovem" ? "homeJovemScreen" : "homeProfessorScreen"
      );
    }, 2000);
  }
}

async function logout() {
  console.log("Iniciando processo de logout...");

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Erro ao fazer logout no Supabase:", error.message);
  } else {
    console.log("Logout do Supabase bem-sucedido.");
  }

  const jovemGreetingEl = document.getElementById("jovemGreeting");
  const homeSaldoAtualEl = document.getElementById("homeSaldoAtual");
  const homeMetaCardContentEl = document.getElementById("homeMetaCardContent");
  const homeMetaEmptyEl = document.getElementById("homeMetaEmpty");
  const homeMetaNomeEl = document.getElementById("homeMetaNome");
  const homeMetaValoresEl = document.getElementById("homeMetaValores");
  const homeMetaProgressValueEl = document.getElementById(
    "homeMetaProgressValue"
  );
  const homeMetaProgressContainerEl = document.getElementById(
    "homeMetaProgressContainer"
  );
  const homeTransacoesListEl = document.getElementById("homeTransacoesList");
  const homeTransacoesEmptyEl = document.getElementById("homeTransacoesEmpty");

  if (jovemGreetingEl) jovemGreetingEl.textContent = "Olá!";
  if (homeSaldoAtualEl) {
    homeSaldoAtualEl.textContent = "R$ --,--";
    homeSaldoAtualEl.classList.remove("text-red-400");
    homeSaldoAtualEl.classList.add("text-green-300");
  }

  if (homeMetaNomeEl) homeMetaNomeEl.textContent = "Nenhuma meta ativa";
  if (homeMetaValoresEl) homeMetaValoresEl.textContent = "R$ 0,00 / R$ 0,00";
  if (homeMetaProgressValueEl) homeMetaProgressValueEl.textContent = "0%";
  if (homeMetaProgressContainerEl) {
    homeMetaProgressContainerEl.style.setProperty("--progress-percent", 0);
    const homeMetaFillEl =
      homeMetaProgressContainerEl.querySelector(".progress-fill");
    if (homeMetaFillEl) homeMetaFillEl.style.transform = "rotate(-45deg)";
  }
  if (homeMetaCardContentEl) homeMetaCardContentEl.classList.add("hidden");
  if (homeMetaEmptyEl) {
    homeMetaEmptyEl.classList.remove("hidden");
    homeMetaEmptyEl.innerHTML =
      'Nenhuma meta ativa no momento. <br> <span class="text-indigo-600 font-semibold cursor-pointer" onclick="navigateTo(\'addMetaScreen\')">Adicione uma!</span>';
  }

  if (homeTransacoesListEl) {
    homeTransacoesListEl.innerHTML = "";
    if (homeTransacoesEmptyEl) {
      homeTransacoesEmptyEl.textContent = "Faça login para ver seus dados.";
      homeTransacoesEmptyEl.classList.remove("hidden");
      homeTransacoesListEl.appendChild(homeTransacoesEmptyEl);
    } else {
      homeTransacoesListEl.innerHTML =
        '<p id="homeTransacoesEmpty" class="text-center text-gray-500">Faça login para ver seus dados.</p>';
    }
  }

  currentUserType = "jovem";
  currentUserName = "";

  navigationHistory = ["loginScreen"];

  navigateTo("loginScreen");
  console.log("Logout finalizado, navegando para loginScreen.");
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    feather.replace();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function sendRecoveryLink() {
  closeModal("forgotPasswordModal");
  showSuccessModal(
    "Link Enviado!",
    "Um link de recuperação foi enviado para o seu e-mail."
  );
}

function criarDesafioProfessor() {
  closeModal("criarDesafioModal");
  showSuccessModal(
    "Desafio Criado!",
    "O novo desafio foi criado e está ativo."
  );
}

function switchDesafioTab(tabName) {
  const ativosContent = document.getElementById("desafiosAtivosContent");
  const concluidosContent = document.getElementById(
    "desafiosConcluidosContent"
  );
  const abaAtivos = document.getElementById("abaDesafiosAtivos");
  const abaConcluidos = document.getElementById("abaDesafiosConcluidos");

  if (tabName === "ativos") {
    ativosContent.classList.remove("hidden");
    concluidosContent.classList.add("hidden");
    abaAtivos.classList.add("text-yellow-600", "border-yellow-500");
    abaAtivos.classList.remove("text-gray-500", "hover:text-yellow-600");
    abaConcluidos.classList.add("text-gray-500", "hover:text-yellow-600");
    abaConcluidos.classList.remove("text-yellow-600", "border-yellow-500");
  } else {
    concluidosContent.classList.remove("hidden");
    ativosContent.classList.add("hidden");
    abaConcluidos.classList.add("text-yellow-600", "border-yellow-500");
    abaConcluidos.classList.remove("text-gray-500", "hover:text-yellow-600");
    abaAtivos.classList.add("text-gray-500", "hover:text-yellow-600");
    abaAtivos.classList.remove("text-yellow-600", "border-yellow-500");
  }
  feather.replace();
}

function simularInvestimento() {
  const valorInicial =
    parseFloat(document.getElementById("valorInicial").value) || 0;
  const aporteMensal =
    parseFloat(document.getElementById("aporteMensal").value) || 0;
  const periodoAnos =
    parseInt(document.getElementById("periodoAnos").value) || 0;
  const periodoMeses = periodoAnos * 12;

  let montantePoupanca = valorInicial;
  for (let i = 0; i < periodoMeses; i++) {
    montantePoupanca += aporteMensal;
    montantePoupanca *= 1 + 0.005;
  }
  document.getElementById(
    "resultadoPoupanca"
  ).textContent = `R$ ${montantePoupanca.toFixed(2).replace(".", ",")}`;

  let montanteAcoes = valorInicial;
  for (let i = 0; i < periodoMeses; i++) {
    montanteAcoes += aporteMensal;
    montanteAcoes *= 1 + 0.01;
  }
  document.getElementById("resultadoAcoes").textContent = `R$ ${montanteAcoes
    .toFixed(2)
    .replace(".", ",")}`;
}

function showSuccessModal(title, message) {
  document.getElementById("successMessageTitle").textContent = title;
  document.getElementById("successMessageText").textContent = message;
  openModal("successMessageModal");
  setTimeout(() => closeModal("successMessageModal"), 3000);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

async function loadTransactions() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("Usuário não logado, não é possível carregar transações.");

    document.getElementById("transacoesList").innerHTML =
      '<p class="text-center text-gray-500">Faça login para ver suas transações.</p>';
    return;
  }

  const transacoesListDiv = document.getElementById("transacoesList");
  if (!transacoesListDiv) {
    console.error(
      "Elemento com ID 'transacoesList' não encontrado na tela de transações."
    );
    return;
  }
  transacoesListDiv.innerHTML =
    '<p class="text-center text-gray-500">Carregando transações...</p>';

  try {
    const { data: transacoes, error } = await supabase
      .from("transacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("data_transacao", { ascending: false });

    if (error) {
      console.error("Erro ao buscar transações:", error);
      transacoesListDiv.innerHTML = `<p class="text-center text-red-500">Erro ao carregar transações: ${error.message}</p>`;
      return;
    }

    if (transacoes && transacoes.length > 0) {
      transacoesListDiv.innerHTML = "";
      transacoes.forEach((transacao) => {
        const itemDiv = document.createElement("div");
        itemDiv.className =
          "bg-white p-3 rounded-lg shadow flex items-center justify-between";

        const iconMap = {
          alimentacao: "🍔",
          transporte: "🚌",
          lazer: "🎉",
          moradia: "🏠",
          educacao: "📚",
          saude: "❤️",
          mesada: "💰",
          presente: "🎁",
          investimento: "📈",
          outros: "📎",
        };
        const icon = iconMap[transacao.categoria] || "📎";
        const valorCor =
          transacao.tipo === "recebimento" ? "text-green-600" : "text-red-600";
        const sinal = transacao.tipo === "recebimento" ? "+" : "-";

        itemDiv.innerHTML = `
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${icon}</span>
                        <div>
                            <p class="font-medium text-gray-800">${
                              transacao.descricao
                            }</p>
                            <p class="text-xs text-gray-500">${formatDate(
                              transacao.data_transacao
                            )}</p>
                        </div>
                    </div>
                    <span class="font-semibold ${valorCor} text-lg">${sinal} R$ ${parseFloat(
          transacao.valor
        )
          .toFixed(2)
          .replace(".", ",")}</span>
                `;
        transacoesListDiv.appendChild(itemDiv);
      });
    } else {
      transacoesListDiv.innerHTML =
        '<p class="text-center text-gray-500">Nenhuma transação encontrada.</p>';
    }
  } catch (e) {
    console.error("Erro inesperado ao carregar transações:", e);
    transacoesListDiv.innerHTML =
      '<p class="text-center text-red-500">Ocorreu um erro inesperado.</p>';
  }
  feather.replace();
}

async function addNovaTransacao() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    showSuccessModal(
      "Erro",
      "Você precisa estar logado para adicionar uma transação.",
      true
    );
    navigateTo("loginScreen");
    return;
  }

  const descricao = document.getElementById("transacaoDescricao").value;
  const valor = parseFloat(document.getElementById("transacaoValor").value);
  const tipo = document.getElementById("transacaoTipo").value;
  const categoria = document.getElementById("transacaoCategoria").value;
  const data_transacao = document.getElementById("transacaoData").value;

  if (!descricao.trim() || isNaN(valor) || valor <= 0 || !data_transacao) {
    showSuccessModal(
      "Erro",
      "Preencha todos os campos corretamente (descrição, valor válido e data).",
      true
    );
    return;
  }

  const novaTransacao = {
    user_id: user.id,
    descricao: descricao,
    valor: valor,
    tipo: tipo,
    categoria: categoria,
    data_transacao: data_transacao,
  };

  const { error } = await supabase.from("transacoes").insert([novaTransacao]);

  if (error) {
    console.error("Erro ao adicionar transação:", error);
    showSuccessModal(
      "Erro ao Salvar",
      `Não foi possível adicionar a transação: ${error.message}`,
      true
    );
  } else {
    showSuccessModal("Sucesso!", "Transação adicionada com sucesso.");

    document.getElementById("transacaoDescricao").value = "";
    document.getElementById("transacaoValor").value = "";
    document.getElementById("transacaoData").valueAsDate = new Date();
    document.getElementById("transacaoTipo").value = "gasto";
    document.getElementById("transacaoCategoria").value = "alimentacao";

    setTimeout(() => {
      if (
        document
          .getElementById("successMessageModal")
          .classList.contains("active")
      ) {
        closeModal("successMessageModal");
      }
      navigateTo("transacoesScreen");
    }, 1500);
  }
}

async function loadMetas() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("Usuário não logado, não é possível carregar metas.");
    document.getElementById("metasList").innerHTML =
      '<p class="text-center text-gray-500">Faça login para ver suas metas.</p>';
    return;
  }

  const metasListDiv = document.getElementById("metasList");
  if (!metasListDiv) {
    console.error(
      "Elemento com ID 'metasList' não encontrado na tela de metas."
    );
    return;
  }
  metasListDiv.innerHTML =
    '<p class="text-center text-gray-500 my-4">Carregando suas metas...</p>';

  try {
    const { data: metas, error } = await supabase
      .from("metas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar metas:", error);
      metasListDiv.innerHTML = `<p class="text-center text-red-500 my-4">Erro ao carregar metas: ${error.message}</p>`;
      return;
    }

    if (metas && metas.length > 0) {
      metasListDiv.innerHTML = "";
      metas.forEach((meta) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "bg-white p-4 rounded-xl shadow-lg";

        const valorTotal = parseFloat(meta.valor_total);
        const valorPoupado = parseFloat(meta.valor_poupado);
        let progressoPercent = 0;
        if (valorTotal > 0) {
          progressoPercent = Math.min((valorPoupado / valorTotal) * 100, 100);
        }

        let statusBadgeClass = "bg-blue-100 text-blue-700";
        if (meta.status_meta === "Concluída") {
          statusBadgeClass = "bg-green-100 text-green-700";
        } else if (meta.status_meta === "Planejando") {
          statusBadgeClass = "bg-yellow-100 text-yellow-700";
        }

        itemDiv.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-semibold text-lg text-indigo-700">${
                          meta.nome_meta
                        }</h3>
                        <span class="text-xs ${statusBadgeClass} px-2 py-1 rounded-full">${
          meta.status_meta
        }</span>
                    </div>
                    ${
                      meta.data_limite
                        ? `<p class="text-sm text-gray-500 mb-2">Data Limite: ${formatDate(
                            meta.data_limite
                          )}</p>`
                        : '<p class="text-sm text-gray-500 mb-2">Sem data limite</p>'
                    }
                    <div class="flex justify-between items-center text-sm mb-1">
                        <span>Poupado: <span class="font-bold text-green-600">R$ ${valorPoupado
                          .toFixed(2)
                          .replace(".", ",")}</span></span>
                        <span>Total: <span class="font-bold text-gray-700">R$ ${valorTotal
                          .toFixed(2)
                          .replace(".", ",")}</span></span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-indigo-500 h-3 rounded-full" style="width: ${progressoPercent.toFixed(
                          2
                        )}%"></div>
                    </div>
                    <!-- Adicionar botões de editar/excluir/marcar como concluída aqui no futuro, se necessário -->
                `;
        metasListDiv.appendChild(itemDiv);
      });
    } else {
      metasListDiv.innerHTML =
        '<p class="text-center text-gray-500 my-4">Você ainda não cadastrou nenhuma meta. Que tal começar agora?</p>';
    }
  } catch (e) {
    console.error("Erro inesperado ao carregar metas:", e);
    metasListDiv.innerHTML =
      '<p class="text-center text-red-500 my-4">Ocorreu um erro inesperado ao buscar suas metas.</p>';
  }
  feather.replace();
}

async function addNovaMeta() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    showSuccessModal(
      "Erro de Autenticação",
      "Você precisa estar logado para adicionar uma meta.",
      true
    );
    navigateTo("loginScreen");
    return;
  }

  const nomeMeta = document.getElementById("metaNome").value;
  const valorTotal = parseFloat(
    document.getElementById("metaValorTotal").value
  );
  let valorPoupado = parseFloat(
    document.getElementById("metaValorPoupado").value
  );
  const dataLimite = document.getElementById("metaDataLimite").value;

  if (!nomeMeta.trim() || isNaN(valorTotal) || valorTotal <= 0) {
    showSuccessModal(
      "Dados Incompletos",
      "Por favor, preencha o nome da meta e um valor total válido.",
      true
    );
    return;
  }
  if (isNaN(valorPoupado) || valorPoupado < 0) {
    valorPoupado = 0;
  }
  if (valorPoupado > valorTotal) {
    showSuccessModal(
      "Valor Inválido",
      "O valor poupado não pode ser maior que o valor total da meta.",
      true
    );
    return;
  }

  const novaMeta = {
    user_id: user.id,
    nome_meta: nomeMeta,
    valor_total: valorTotal,
    valor_poupado: valorPoupado,
    data_limite: dataLimite || null,
    status_meta: "Em Andamento",
  };

  const { error } = await supabase.from("metas").insert([novaMeta]);

  if (error) {
    console.error("Erro ao adicionar meta:", error);
    showSuccessModal(
      "Erro ao Salvar",
      `Não foi possível adicionar a meta: ${error.message}`,
      true
    );
  } else {
    showSuccessModal(
      "Meta Adicionada!",
      "Sua nova meta foi registrada com sucesso."
    );

    document.getElementById("metaNome").value = "";
    document.getElementById("metaValorTotal").value = "";
    document.getElementById("metaValorPoupado").value = "0";
    document.getElementById("metaDataLimite").value = "";

    setTimeout(() => {
      if (
        document
          .getElementById("successMessageModal")
          .classList.contains("active")
      ) {
        closeModal("successMessageModal");
      }
      navigateTo("metasScreen");
    }, 1500);
  }
}

async function loadHomeData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jovemGreetingEl = document.getElementById("jovemGreeting");
  const homeSaldoAtualEl = document.getElementById("homeSaldoAtual");
  const homeMetaCardContentEl = document.getElementById("homeMetaCardContent");
  const homeMetaEmptyEl = document.getElementById("homeMetaEmpty");
  const homeMetaNomeEl = document.getElementById("homeMetaNome");
  const homeMetaValoresEl = document.getElementById("homeMetaValores");
  const homeMetaProgressValueEl = document.getElementById(
    "homeMetaProgressValue"
  );
  const homeMetaProgressContainerEl = document.getElementById(
    "homeMetaProgressContainer"
  );
  const homeTransacoesListEl = document.getElementById("homeTransacoesList");
  const homeTransacoesEmptyEl = document.getElementById("homeTransacoesEmpty");

  if (!user) {
    console.log("loadHomeData: Usuário não logado. Resetando UI da home.");

    if (jovemGreetingEl) jovemGreetingEl.textContent = "Olá!";
    if (homeSaldoAtualEl) {
      homeSaldoAtualEl.textContent = "R$ --,--";
      homeSaldoAtualEl.classList.remove("text-red-400");
      homeSaldoAtualEl.classList.add("text-green-300");
    }

    if (homeMetaNomeEl) homeMetaNomeEl.textContent = "Nenhuma meta ativa";
    if (homeMetaValoresEl) homeMetaValoresEl.textContent = "R$ 0,00 / R$ 0,00";
    if (homeMetaProgressValueEl) homeMetaProgressValueEl.textContent = "0%";
    if (homeMetaProgressContainerEl) {
      homeMetaProgressContainerEl.style.setProperty("--progress-percent", 0);
      const homeMetaFillEl =
        homeMetaProgressContainerEl.querySelector(".progress-fill");
      if (homeMetaFillEl) homeMetaFillEl.style.transform = "rotate(-45deg)";
    }
    if (homeMetaCardContentEl) homeMetaCardContentEl.classList.add("hidden");
    if (homeMetaEmptyEl) homeMetaEmptyEl.classList.remove("hidden");

    if (homeTransacoesListEl) {
      homeTransacoesListEl.innerHTML =
        '<p id="homeTransacoesEmpty" class="text-center text-gray-500">Faça login para ver seus dados.</p>';
    }
    return;
  }

  console.log("loadHomeData: Usuário logado. Carregando dados da home.");
  if (jovemGreetingEl && currentUserName) {
    jovemGreetingEl.textContent = `Olá, ${currentUserName}!`;
  }

  if (homeMetaCardContentEl) homeMetaCardContentEl.classList.remove("hidden");
  if (homeMetaEmptyEl) homeMetaEmptyEl.classList.add("hidden");

  await loadActiveMetaForHome(user.id);
  await loadRecentTransactionsForHome(user.id);
  await calculateAndDisplaySaldo(user.id);
}

async function loadActiveMetaForHome(userId) {
  const homeMetaNomeEl = document.getElementById("homeMetaNome");
  const homeMetaValoresEl = document.getElementById("homeMetaValores");
  const homeMetaProgressValueEl = document.getElementById(
    "homeMetaProgressValue"
  );
  const homeMetaProgressContainerEl = document.getElementById(
    "homeMetaProgressContainer"
  );
  const homeMetaFillEl = homeMetaProgressContainerEl
    ? homeMetaProgressContainerEl.querySelector(".progress-fill")
    : null;
  const homeMetaEmptyEl = document.getElementById("homeMetaEmpty");
  const homeMetaCardContentEl = document.getElementById("homeMetaCardContent");

  if (
    !homeMetaNomeEl ||
    !homeMetaValoresEl ||
    !homeMetaProgressValueEl ||
    !homeMetaProgressContainerEl ||
    !homeMetaEmptyEl ||
    !homeMetaCardContentEl
  ) {
    console.error(
      "loadActiveMetaForHome: Elementos da UI da meta na home não encontrados."
    );
    return;
  }

  const { data: metas, error } = await supabase
    .from("metas")
    .select("*")
    .eq("user_id", userId)
    .eq("status_meta", "Em Andamento")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Erro ao buscar meta para home:", error.message);
    homeMetaCardContentEl.classList.add("hidden");
    homeMetaEmptyEl.classList.remove("hidden");
    homeMetaEmptyEl.textContent = "Erro ao carregar meta.";
    return;
  }

  if (metas && metas.length > 0) {
    homeMetaCardContentEl.classList.remove("hidden");
    homeMetaEmptyEl.classList.add("hidden");

    const meta = metas[0];
    const valorTotal = parseFloat(meta.valor_total);
    const valorPoupado = parseFloat(meta.valor_poupado);
    let progressoPercent = 0;
    if (valorTotal > 0) {
      progressoPercent = Math.min((valorPoupado / valorTotal) * 100, 100);
    }

    homeMetaNomeEl.textContent = meta.nome_meta;
    homeMetaValoresEl.textContent = `R$ ${valorPoupado
      .toFixed(2)
      .replace(".", ",")} / R$ ${valorTotal.toFixed(2).replace(".", ",")}`;
    homeMetaProgressValueEl.textContent = `${progressoPercent.toFixed(0)}%`;
    homeMetaProgressContainerEl.style.setProperty(
      "--progress-percent",
      progressoPercent.toFixed(0)
    );

    if (homeMetaFillEl) {
      homeMetaFillEl.style.animation = "none";
      homeMetaFillEl.offsetHeight;
      homeMetaFillEl.style.animation = "";
    }
  } else {
    homeMetaCardContentEl.classList.add("hidden");
    homeMetaEmptyEl.classList.remove("hidden");

    homeMetaEmptyEl.innerHTML =
      'Nenhuma meta ativa no momento. <br> <span class="text-indigo-600 font-semibold cursor-pointer" onclick="navigateTo(\'addMetaScreen\')">Adicione uma!</span>';
  }
}

async function loadRecentTransactionsForHome(userId) {
  const listElement = document.getElementById("homeTransacoesList");
  const emptyMessageElement = document.getElementById("homeTransacoesEmpty");

  if (!listElement || !emptyMessageElement) {
    console.error(
      "loadRecentTransactionsForHome: Elementos da UI de transações na home não encontrados."
    );
    return;
  }

  listElement.innerHTML = "";
  emptyMessageElement.classList.add("hidden");

  const { data: transacoes, error } = await supabase
    .from("transacoes")
    .select("descricao, tipo, valor, data_transacao")
    .eq("user_id", userId)
    .order("data_transacao", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Erro ao buscar transações para home:", error.message);
    listElement.appendChild(emptyMessageElement);
    emptyMessageElement.textContent = "Erro ao carregar transações.";
    emptyMessageElement.classList.remove("hidden");
    return;
  }

  if (transacoes && transacoes.length > 0) {
    transacoes.forEach((transacao) => {
      const listItem = document.createElement("li");
      listItem.className = "flex justify-between items-center text-sm";

      const iconClass =
        transacao.tipo === "recebimento" ? "text-green-500" : "text-red-500";
      const iconFeather =
        transacao.tipo === "recebimento"
          ? "arrow-down-circle"
          : "arrow-up-circle";
      const valorClass =
        transacao.tipo === "recebimento" ? "text-green-600" : "text-red-600";
      const sinal = transacao.tipo === "recebimento" ? "+" : "-";

      listItem.innerHTML = `
                <span class="flex items-center"><i data-feather="${iconFeather}" class="${iconClass} mr-2 w-4 h-4"></i> ${
        transacao.descricao
      }</span>
                <span class="${valorClass} font-medium">${sinal} R$ ${parseFloat(
        transacao.valor
      )
        .toFixed(2)
        .replace(".", ",")}</span>
            `;
      listElement.appendChild(listItem);
    });
    feather.replace();
  } else {
    listElement.appendChild(emptyMessageElement);
    emptyMessageElement.textContent = "Nenhuma transação recente.";
    emptyMessageElement.classList.remove("hidden");
  }
}

async function calculateAndDisplaySaldo(userId) {
  const saldoEl = document.getElementById("homeSaldoAtual");
  if (!saldoEl) {
    console.error(
      "calculateAndDisplaySaldo: Elemento do saldo na home não encontrado."
    );
    return;
  }

  const { data: transacoes, error } = await supabase
    .from("transacoes")
    .select("tipo, valor")
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao calcular saldo:", error.message);
    saldoEl.textContent = "R$ Erro";
    saldoEl.classList.remove("text-green-300", "text-red-400");
    return;
  }

  let saldo = 0;
  if (transacoes) {
    transacoes.forEach((t) => {
      const valorTransacao = parseFloat(t.valor);
      if (isNaN(valorTransacao)) {
        console.warn("Valor de transação inválido encontrado:", t);
        return;
      }
      if (t.tipo === "recebimento") {
        saldo += valorTransacao;
      } else if (t.tipo === "gasto") {
        saldo -= valorTransacao;
      }
    });
  }
  saldoEl.textContent = `R$ ${saldo.toFixed(2).replace(".", ",")}`;
  if (saldo < 0) {
    saldoEl.classList.remove("text-green-300");
    saldoEl.classList.add("text-red-400");
  } else {
    saldoEl.classList.remove("text-red-400");
    saldoEl.classList.add("text-green-300");
  }
}

async function uploadAvatar(event) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("Nenhum usuário logado para fazer upload do avatar.");
    return;
  }

  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  showSuccessModal("Aguarde...", "Fazendo upload da sua nova foto...");

  try {
    let { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error("Não foi possível obter a URL pública da imagem.");
    }

    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("perfis")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    const avatarImg = document.getElementById("perfilAvatarImg");
    if (avatarImg) {
      avatarImg.src = publicUrl;
    }
    showSuccessModal("Sucesso!", "Sua foto de perfil foi atualizada.");
  } catch (error) {
    console.error("Erro no upload do avatar:", error.message);
    showSuccessModal(
      "Erro!",
      `Não foi possível atualizar sua foto: ${error.message}`,
      true
    );
  }
}

function setupAvatarUploadListener() {
  const avatarUploadInput = document.getElementById("avatarUpload");
  if (avatarUploadInput) {
    avatarUploadInput.addEventListener("change", uploadAvatar);
  }
}
