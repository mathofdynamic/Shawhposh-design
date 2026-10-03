module.exports={apps:[{
 name:'shawhposh-api',cwd:'/home/ubuntu/shawhposh/current',script:'server-dist/index.js',
 instances:1,exec_mode:'fork',node_args:'--max-old-space-size=96',max_memory_restart:'160M',
 autorestart:true,min_uptime:'10s',max_restarts:10,restart_delay:3000,kill_timeout:11000,
 env:{NODE_ENV:'production'},time:true,
 out_file:'/home/ubuntu/.pm2/logs/shawhposh-api-out.log',error_file:'/home/ubuntu/.pm2/logs/shawhposh-api-error.log'
}]};
