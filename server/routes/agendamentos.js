router.get('/', supabaseAuthMiddleware, async (req, res) => {
    const { ano, mes, data, mesAno } = req.query;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    try {
        let query = supabase
            .from('playlists_agendamentos')
            .select(`
                *,
                playlist_principal:playlists!playlists_agendamentos_id_playlist_fkey (id, nome),
                playlist_finalizacao:playlists!playlists_agendamentos_id_playlist_finalizacao_fkey (id, nome)
            `)
            .eq('id_user', userId);

        if (mesAno) {
            const [anoStr, mesStr] = mesAno.split('-');
            const ano = anoStr;
            const mes = mesStr;

            const inicioMes = `${ano}-${mes.padStart(2, '0')}-01`;
            const mesNum = parseInt(mes, 10);
            const proximoMes = mesNum === 12 ? 1 : mesNum + 1;
            const anoFim = mesNum === 12 ? parseInt(ano, 10) + 1 : parseInt(ano, 10);
            const fimMes = `${anoFim}-${proximoMes.toString().padStart(2, '0')}-01`;

            query = query.gte('data', inicioMes).lt('data', fimMes);
        } else if (ano && mes) {
            const inicioMes = `${ano}-${mes.padStart(2, '0')}-01`;
            const mesNum = parseInt(mes, 10);
            const proximoMes = mesNum === 12 ? 1 : mesNum + 1;
            const anoFim = mesNum === 12 ? parseInt(ano, 10) + 1 : parseInt(ano, 10);
            const fimMes = `${anoFim}-${proximoMes.toString().padStart(2, '0')}-01`;

            query = query.gte('data', inicioMes).lt('data', fimMes);
        } else if (data) {
            query = query.eq('data', data);
        }

        const { data: agendamentos, error } = await query;

        if (error) {
            console.error('Erro ao buscar agendamentos no Supabase:', error.message);
            return res.status(500).json({ error: error.message });
        }

        // Desembrulha os nomes das playlists para simplificar o frontend
        const agendamentosComNomes = agendamentos.map(ag => ({
            ...ag,
            nome_playlist_principal: ag.playlist_principal?.nome ?? '-',
            nome_playlist_finalizacao: ag.playlist_finalizacao?.nome ?? '-',
        }));

        res.json(agendamentosComNomes);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Erro interno no servidor' });
    }

});
export default router;